import type { Usuario } from './session';

/**
 * Mapeia o usuário Cognito para um autor do domínio.
 * MOCK por ora (a ligação real por `cognito_sub` entra no prompt 07 / Bloco 5).
 * Até lá, o portal do jornalista opera sobre um autor de demonstração.
 */
const AUTOR_DEMO = 'a-2';

export function autorIdDoUsuario(_u: Usuario): string {
  return AUTOR_DEMO;
}
