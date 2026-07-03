import 'server-only';
import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
  AdminListGroupsForUserCommand,
  AdminCreateUserCommand,
  AdminAddUserToGroupCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import type { Papel } from '@/types';
import { getAuthConfig, authConfigurada } from './config';

export interface UsuarioAdmin {
  username: string;
  email?: string;
  nome?: string;
  status?: string;
  grupos: string[];
}

let clientCache: CognitoIdentityProviderClient | null = null;
function client(): CognitoIdentityProviderClient {
  if (!clientCache) {
    clientCache = new CognitoIdentityProviderClient({ region: getAuthConfig().region });
  }
  return clientCache;
}

/** Lista usuários do pool (com grupos). Retorna [] se auth não configurada. */
export async function listarUsuarios(): Promise<UsuarioAdmin[]> {
  const c = getAuthConfig();
  if (!authConfigurada(c)) return [];
  const res = await client().send(
    new ListUsersCommand({ UserPoolId: c.userPoolId, Limit: 60 }),
  );
  const usuarios = res.Users ?? [];
  return Promise.all(
    usuarios.map(async (u) => {
      const attr = (n: string) => u.Attributes?.find((a) => a.Name === n)?.Value;
      let grupos: string[] = [];
      try {
        const g = await client().send(
          new AdminListGroupsForUserCommand({ UserPoolId: c.userPoolId, Username: u.Username }),
        );
        grupos = (g.Groups ?? []).map((x) => x.GroupName ?? '').filter(Boolean);
      } catch {
        /* sem permissão de listar grupos — segue sem */
      }
      return {
        username: u.Username ?? '',
        email: attr('email'),
        nome: attr('name'),
        status: u.UserStatus,
        grupos,
      };
    }),
  );
}

/** Cria usuário (envia convite por e-mail) e o adiciona ao grupo/papel. */
export async function criarUsuario(email: string, nome: string, grupo: Papel): Promise<void> {
  const c = getAuthConfig();
  if (!authConfigurada(c)) throw new Error('Autenticação não configurada neste ambiente.');
  await client().send(
    new AdminCreateUserCommand({
      UserPoolId: c.userPoolId,
      Username: email,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'name', Value: nome },
      ],
      DesiredDeliveryMediums: ['EMAIL'],
    }),
  );
  await client().send(
    new AdminAddUserToGroupCommand({ UserPoolId: c.userPoolId, Username: email, GroupName: grupo }),
  );
}
