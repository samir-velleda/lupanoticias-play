/**
 * LupaNetwork — VPC dedicada e isolada do projeto Lupa.
 * Cria a PRÓPRIA VPC `lupa-vpc-<env>` (NUNCA usa a default). Ver CLAUDE.md §0.
 */
import { Stack, StackProps } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { LupaEnv, resourceName, isProd } from './config';

export interface LupaNetworkStackProps extends StackProps {
  readonly envName: LupaEnv;
}

export class LupaNetworkStack extends Stack {
  public readonly vpc: ec2.Vpc;
  /** SG dedicado do banco (ingress liberado só p/ SGs do projeto, ver data-stack). */
  public readonly dbSecurityGroup: ec2.SecurityGroup;
  /** SG das Lambdas/compute do projeto (fonte de acesso ao banco). */
  public readonly appSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: LupaNetworkStackProps) {
    super(scope, id, props);
    const { envName } = props;

    this.vpc = new ec2.Vpc(this, 'Vpc', {
      vpcName: resourceName('vpc', envName),
      maxAzs: 2,
      // 1 NAT em dev (custo); 2 em prod (alta disponibilidade).
      natGateways: isProd(envName) ? 2 : 1,
      subnetConfiguration: [
        {
          name: resourceName('public', envName),
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          // compute (Lambdas) — egress via NAT
          name: resourceName('app', envName),
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
        {
          // Aurora — isoladas, sem rota p/ internet
          name: resourceName('data', envName),
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
    });

    this.appSecurityGroup = new ec2.SecurityGroup(this, 'AppSg', {
      vpc: this.vpc,
      securityGroupName: resourceName('app-sg', envName),
      description: 'Lupa app/compute (Lambdas) - fonte de acesso ao Aurora.',
      allowAllOutbound: true,
    });

    this.dbSecurityGroup = new ec2.SecurityGroup(this, 'DbSg', {
      vpc: this.vpc,
      securityGroupName: resourceName('db-sg', envName),
      description: 'Lupa Aurora - ingress 5432 somente do app-sg do projeto.',
      allowAllOutbound: false,
    });

    // Isolamento: só o app-sg do projeto pode falar com o banco.
    this.dbSecurityGroup.addIngressRule(
      this.appSecurityGroup,
      ec2.Port.tcp(5432),
      'Postgres do app-sg lupa',
    );
  }
}
