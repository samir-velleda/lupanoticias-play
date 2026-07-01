#!/usr/bin/env node
/**
 * Entrypoint do app CDK do Lupa Notícias.
 * GUARDA-CORPO: TODAS as stacks têm prefixo `Lupa` e recebem tags de projeto.
 * Region fixa `us-east-1`. Ambiente via `-c env=dev|prod` (default: dev).
 * Ver CLAUDE.md §0 e docs/AWS_ARCHITECTURE.md.
 */
import { App, Environment } from 'aws-cdk-lib';
import { applyLupaTags, auditNaming } from '../lib/tags';
import { REGION, resolveEnv, stackName } from '../lib/config';
import { LupaNetworkStack } from '../lib/network-stack';
import { LupaDataStack } from '../lib/data-stack';
import { LupaStorageStack } from '../lib/storage-stack';
import { LupaAuthStack } from '../lib/auth-stack';

const app = new App();

const envName = resolveEnv(
  (app.node.tryGetContext('env') as string | undefined) ?? process.env.LUPA_ENV,
);

// Conta resolvida do ambiente CLI; region SEMPRE us-east-1 (nunca sair dela).
const env: Environment = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: REGION,
};

const network = new LupaNetworkStack(app, stackName('Network', envName), {
  env,
  envName,
  description: `Lupa VPC/rede isolada (${envName}).`,
});

const data = new LupaDataStack(app, stackName('Data', envName), {
  env,
  envName,
  vpc: network.vpc,
  dbSecurityGroup: network.dbSecurityGroup,
  description: `Lupa Aurora PostgreSQL Serverless v2 (${envName}).`,
});
data.addDependency(network);

new LupaStorageStack(app, stackName('Storage', envName), {
  env,
  envName,
  description: `Lupa S3 (media/uploads/static) + CloudFront (${envName}).`,
});

new LupaAuthStack(app, stackName('Auth', envName), {
  env,
  envName,
  description: `Lupa Cognito User Pool + grupos (${envName}).`,
});

// Tags obrigatórias + auditoria de naming em toda a árvore do app.
applyLupaTags(app, envName);
auditNaming(app);
