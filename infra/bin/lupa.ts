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
import { LupaWebStack } from '../lib/web-stack';

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

// Web (SSR/API em Lambda + CloudFront). Importa recursos via SSM lookup —
// sem depender/alterar as outras stacks. Domínio custom via contexto (opcional).
const domainNamesCtx = app.node.tryGetContext('webDomainNames') as string | undefined;
new LupaWebStack(app, stackName('Web', envName), {
  env,
  envName,
  description: `Lupa Next SSR/API (Lambda Web Adapter) + CloudFront (${envName}).`,
  lwaLayerArn: app.node.tryGetContext('lwaLayerArn') as string | undefined,
  certificateArn: app.node.tryGetContext('webCertArn') as string | undefined,
  domainNames: domainNamesCtx
    ? domainNamesCtx.split(',').map((d) => d.trim()).filter(Boolean)
    : undefined,
});

// Tags obrigatórias + auditoria de naming em toda a árvore do app.
applyLupaTags(app, envName);
auditNaming(app);
