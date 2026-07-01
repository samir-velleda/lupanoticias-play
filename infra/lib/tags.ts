/**
 * Lupa Notícias — aplicação obrigatória de tags e verificação de prefixo.
 * GUARDA-CORPO: todo recurso do projeto DEVE carregar Project=lupa-noticias.
 * O prefixo de nome `lupa-` e os nomes de stack `Lupa*` são a fronteira de
 * isolamento na conta Boovest. Ver CLAUDE.md §0 e docs/AWS_ARCHITECTURE.md.
 */
import { Tags, Aspects, IAspect, Annotations, CfnResource } from 'aws-cdk-lib';
import { IConstruct } from 'constructs';

export const PROJECT_TAG = 'lupa-noticias';
export const NAME_PREFIX = 'lupa-';
export const STACK_PREFIX = 'Lupa';

/** Aplica tags de projeto/ambiente em toda a árvore de constructs. */
export function applyLupaTags(scope: IConstruct, env: string): void {
  Tags.of(scope).add('Project', PROJECT_TAG);
  Tags.of(scope).add('Env', env);
  Tags.of(scope).add('ManagedBy', 'cdk');
}

/**
 * Aspecto de auditoria: avisa (Annotation) no synth quando um recurso com
 * nome físico explícito NÃO começa com o prefixo `lupa-`. É um guarda-corpo
 * de revisão — o bloqueio real de deploy é o `cdk diff` restrito a `Lupa*`
 * (ver docs/GIT_CICD.md §3). Não falha o synth: recursos sem nome explícito
 * (a maioria) são nomeados automaticamente pelo CloudFormation e ignorados.
 *
 * Mapa: tipo CloudFormation -> propriedade que carrega o nome físico.
 */
const NAMED_PROPS: Readonly<Record<string, string>> = {
  'AWS::S3::Bucket': 'bucketName',
  'AWS::RDS::DBCluster': 'dbClusterIdentifier',
  'AWS::EC2::VPC': 'vpcName',
  'AWS::Cognito::UserPool': 'userPoolName',
  'AWS::EC2::SecurityGroup': 'groupName',
};

export class LupaNamingAudit implements IAspect {
  visit(node: IConstruct): void {
    if (!CfnResource.isCfnResource(node)) return;
    const prop = NAMED_PROPS[node.cfnResourceType];
    if (!prop) return;
    const name = (node as unknown as Record<string, unknown>)[prop];
    if (typeof name === 'string' && !name.startsWith(NAME_PREFIX)) {
      Annotations.of(node).addWarning(
        `Recurso ${node.cfnResourceType} com nome "${name}" fora do prefixo "${NAME_PREFIX}" (guarda-corpo de isolamento).`,
      );
    }
  }
}

export function auditNaming(scope: IConstruct): void {
  Aspects.of(scope).add(new LupaNamingAudit());
}
