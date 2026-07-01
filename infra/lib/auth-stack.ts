/**
 * LupaAuth — Cognito User Pool `lupa-users-<env>` + grupos admin/diretor/jornalista.
 * App client + domínio hospedado. Sem federação por ora. Ver docs §6.
 */
import { Stack, StackProps, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { LupaEnv, resourceName, ssmPrefix, isProd } from './config';

export interface LupaAuthStackProps extends StackProps {
  readonly envName: LupaEnv;
}

const GROUPS: ReadonlyArray<{ name: string; description: string; precedence: number }> = [
  { name: 'admin', description: 'Administradores — acesso total.', precedence: 1 },
  { name: 'diretor', description: 'Diretor de Redação — pauta/aprova/recusa.', precedence: 2 },
  { name: 'jornalista', description: 'Jornalistas — criam/editam matérias.', precedence: 3 },
];

export class LupaAuthStack extends Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props: LupaAuthStackProps) {
    super(scope, id, props);
    const { envName } = props;
    const prod = isProd(envName);

    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: resourceName('users', envName),
      selfSignUpEnabled: false, // contas de staff são criadas pelo admin
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true, mutable: true },
        fullname: { required: false, mutable: true },
      },
      passwordPolicy: {
        minLength: 12,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: prod ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
    });

    for (const g of GROUPS) {
      new cognito.CfnUserPoolGroup(this, `Group-${g.name}`, {
        userPoolId: this.userPool.userPoolId,
        groupName: g.name,
        description: g.description,
        precedence: g.precedence,
      });
    }

    this.userPoolClient = this.userPool.addClient('WebClient', {
      userPoolClientName: resourceName('web-client', envName),
      generateSecret: false, // client público (SPA/Next)
      authFlows: { userSrp: true, userPassword: false },
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [cognito.OAuthScope.EMAIL, cognito.OAuthScope.OPENID, cognito.OAuthScope.PROFILE],
      },
      preventUserExistenceErrors: true,
    });

    // Domínio hospedado do Cognito (prefixo único por ambiente).
    const domain = this.userPool.addDomain('HostedDomain', {
      cognitoDomain: { domainPrefix: resourceName('users', envName) },
    });

    // Referências p/ próximos prompts.
    const params: Record<string, string> = {
      'cognito/user-pool-id': this.userPool.userPoolId,
      'cognito/user-pool-client-id': this.userPoolClient.userPoolClientId,
      'cognito/domain-base': domain.baseUrl(),
    };
    for (const [key, value] of Object.entries(params)) {
      new ssm.StringParameter(this, `Param-${key.replace(/\//g, '-')}`, {
        parameterName: `${ssmPrefix(envName)}/${key}`,
        stringValue: value,
      });
    }

    new CfnOutput(this, 'UserPoolId', { value: this.userPool.userPoolId });
    new CfnOutput(this, 'UserPoolClientId', { value: this.userPoolClient.userPoolClientId });
    new CfnOutput(this, 'CognitoDomain', { value: domain.baseUrl() });
  }
}
