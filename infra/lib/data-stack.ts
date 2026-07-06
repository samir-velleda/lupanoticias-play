/**
 * LupaData — Aurora PostgreSQL Serverless v2 isolada em subnets privadas.
 * Credenciais em Secrets Manager `/lupa/<env>/aurora`. Deletion protection
 * LIGADO em prod. Ver docs/AWS_ARCHITECTURE.md §7 e CLAUDE.md §0.
 */
import { Stack, StackProps, Duration, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { LupaEnv, resourceName, ssmPrefix, isProd } from './config';

export interface LupaDataStackProps extends StackProps {
  readonly envName: LupaEnv;
  readonly vpc: ec2.IVpc;
  readonly dbSecurityGroup: ec2.ISecurityGroup;
}

export class LupaDataStack extends Stack {
  public readonly cluster: rds.DatabaseCluster;

  constructor(scope: Construct, id: string, props: LupaDataStackProps) {
    super(scope, id, props);
    const { envName, vpc, dbSecurityGroup } = props;
    const prod = isProd(envName);

    const secretName = `${ssmPrefix(envName)}/aurora`;

    this.cluster = new rds.DatabaseCluster(this, 'Aurora', {
      clusterIdentifier: resourceName('aurora', envName),
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.of('16.4', '16'),
      }),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [dbSecurityGroup],
      defaultDatabaseName: 'lupa',
      // Serverless v2: min baixo em dev p/ custo (docs §10).
      // dev: piso 0.5→1 ACU (autorizado) — folga de conexão/latência, sem picos de
      // connect-timeout ao sair do piso. Modify IN-PLACE do cluster (sem recriar/dados).
      serverlessV2MinCapacity: 1,
      serverlessV2MaxCapacity: prod ? 8 : 2,
      writer: rds.ClusterInstance.serverlessV2('writer', {
        instanceIdentifier: resourceName('aurora-writer', envName),
      }),
      credentials: rds.Credentials.fromGeneratedSecret('lupa_admin', {
        secretName,
      }),
      storageEncrypted: true,
      backup: { retention: Duration.days(prod ? 14 : 7) },
      // Proteção MÁXIMA em todos os ambientes (CLAUDE.md §0):
      // - deletionProtection: o cluster não pode ser deletado sem desligar isto antes.
      // - RETAIN: se a stack for destruída, o banco PERMANECE (nunca é apagado).
      //   RETAIN é mais forte que SNAPSHOT (não deleta x deleta-com-backup); a rede
      //   de recuperação são os backups automáticos (>=7d) + a trava de deletion.
      deletionProtection: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    // Publica referências p/ os próximos prompts (SSM + CfnOutput).
    new ssm.StringParameter(this, 'ClusterArnParam', {
      parameterName: `${ssmPrefix(envName)}/aurora/cluster-arn`,
      stringValue: this.cluster.clusterArn,
    });
    new ssm.StringParameter(this, 'ClusterEndpointParam', {
      parameterName: `${ssmPrefix(envName)}/aurora/endpoint`,
      stringValue: this.cluster.clusterEndpoint.hostname,
    });
    if (this.cluster.secret) {
      new ssm.StringParameter(this, 'SecretArnParam', {
        parameterName: `${ssmPrefix(envName)}/aurora/secret-arn`,
        stringValue: this.cluster.secret.secretArn,
      });
    }

    new CfnOutput(this, 'AuroraClusterArn', { value: this.cluster.clusterArn });
    new CfnOutput(this, 'AuroraEndpoint', {
      value: this.cluster.clusterEndpoint.hostname,
    });
    new CfnOutput(this, 'AuroraSecretArn', {
      value: this.cluster.secret?.secretArn ?? 'n/a',
    });
  }
}
