import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Varredura dos FLUXOS LOGADOS por teste de servidor com contexto de cada papel
 * (login humano não é automatizável). Mocka auth + next/* e usa os repositórios MOCK
 * reais. Trava: autorização por papel, ownership, guardas de estado, validação (Zod).
 */

const h = vi.hoisted(() => ({
  user: null as null | { sub: string; grupos: string[]; autorId: string },
  criarUsuarioStub: vi.fn(async () => {}),
}));

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));
vi.mock('next/navigation', () => ({
  redirect: (p: string) => {
    throw new Error('REDIRECT:' + p);
  },
  notFound: () => {
    throw new Error('NOTFOUND');
  },
}));
vi.mock('@/lib/auth/session', () => ({
  getUsuarioAtual: async () => h.user,
  exigirGrupo: async (...grupos: string[]) => {
    if (!h.user) throw new Error('REDIRECT:/api/auth/login');
    const ok = h.user.grupos.includes('admin') || grupos.some((g) => h.user!.grupos.includes(g));
    if (!ok) throw new Error('REDIRECT:/sem-acesso');
    return h.user;
  },
}));
vi.mock('@/lib/auth/perfil', () => ({
  autorIdDoUsuario: (u: { autorId?: string }) => u.autorId ?? 'a-2',
}));
vi.mock('@/lib/auth/admin', () => ({ criarUsuario: h.criarUsuarioStub }));

import { salvarMateria, reabrirParaCorrecao } from '@/lib/actions/materias';
import { aprovarMateria, recusarMateria, definirModoAutomatico } from '@/lib/actions/redacao';
import { criarUsuarioAction } from '@/lib/actions/usuarios';
import { repositories } from '@/lib/data/repositories';

function login(grupos: string[], autorId = 'a-2', sub = 'sub-test') {
  h.user = { sub, grupos, autorId };
}
function logout() {
  h.user = null;
}

let _n = 0;
const titulo = () => `Action test ${++_n}`;
const payloadBase = (over: Record<string, unknown> = {}) => ({
  titulo: titulo(),
  standfirst: 's',
  editoria: 'economia',
  tags: [],
  corpo: [{ type: 'paragraph', text: 'x' }],
  ...over,
});

/** salvarMateria redireciona em sucesso → captura REDIRECT como "ok"; re-lança erros reais. */
async function salvarOk(payload: Record<string, unknown>): Promise<boolean> {
  try {
    await salvarMateria(payload as never);
    return true;
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('REDIRECT:/jornalista')) return true;
    throw e;
  }
}

/** cria uma matéria publicada de a-2 direto pelo repo (setup). */
async function publicarDeA2() {
  const m = await repositories.materias.criar({
    titulo: titulo(),
    standfirst: 's',
    editoria: 'economia',
    corpo: [{ type: 'paragraph', text: 'x' }],
    tags: [],
  });
  await repositories.materias.enviarParaRevisao(m.id);
  return repositories.materias.aprovar(m.id, 'rev');
}

beforeEach(() => logout());

describe('salvarMateria — autorização', () => {
  it('não logado → redireciona ao login', async () => {
    await expect(salvarMateria(payloadBase() as never)).rejects.toThrow('REDIRECT:/api/auth/login');
  });
  it('sem papel (leitor) → sem-acesso', async () => {
    login([]);
    await expect(salvarMateria(payloadBase() as never)).rejects.toThrow('REDIRECT:/sem-acesso');
  });
});

describe('salvarMateria — criação e validação', () => {
  it('jornalista cria rascunho', async () => {
    login(['jornalista']);
    const t = titulo();
    expect(await salvarOk(payloadBase({ titulo: t }))).toBe(true);
    const minhas = await repositories.materias.listMinhas('a-2');
    expect(minhas.some((m) => m.titulo === t && m.status === 'rascunho')).toBe(true);
  });
  it('título vazio é rejeitado (Zod)', async () => {
    login(['jornalista']);
    await expect(salvarMateria(payloadBase({ titulo: '   ' }) as never)).rejects.toThrow(/título/i);
  });
  it('editoria inválida é rejeitada (Zod)', async () => {
    login(['jornalista']);
    await expect(salvarMateria(payloadBase({ editoria: 'zzz' }) as never)).rejects.toThrow(/editoria/i);
  });
  it('bloco malformado é rejeitado (Zod discriminatedUnion)', async () => {
    login(['jornalista']);
    await expect(
      salvarMateria(payloadBase({ corpo: [{ type: 'paragraph' }] }) as never),
    ).rejects.toThrow();
  });
});

describe('salvarMateria — ownership e estado', () => {
  it('jornalista não edita matéria de outro autor', async () => {
    login(['jornalista']); // autorId a-2
    const t = titulo();
    await salvarOk(payloadBase({ titulo: t }));
    const draft = (await repositories.materias.listMinhas('a-2')).find((m) => m.titulo === t)!;
    // outro jornalista (autorId a-9) tenta editar
    login(['jornalista'], 'a-9');
    await expect(
      salvarMateria(payloadBase({ id: draft.id, titulo: 'hack' }) as never),
    ).rejects.toThrow(/suas próprias/i);
  });
  it('editar publicada direto é bloqueado (só via correção)', async () => {
    const pub = await publicarDeA2();
    login(['jornalista']); // a-2, dona
    await expect(
      salvarMateria(payloadBase({ id: pub.id, titulo: 'edit direto' }) as never),
    ).rejects.toThrow();
  });
  it('admin ignora ownership em rascunho', async () => {
    login(['jornalista']);
    const t = titulo();
    await salvarOk(payloadBase({ titulo: t }));
    const draft = (await repositories.materias.listMinhas('a-2')).find((m) => m.titulo === t)!;
    login(['admin'], 'a-9');
    expect(await salvarOk(payloadBase({ id: draft.id, titulo: 'admin edit' }))).toBe(true);
  });
});

describe('aprovar / recusar — papel + justificativa + estado', () => {
  async function pendenteDeA2() {
    const m = await repositories.materias.criar({
      titulo: titulo(), standfirst: 's', editoria: 'economia',
      corpo: [{ type: 'paragraph', text: 'x' }], tags: [],
    });
    await repositories.materias.enviarParaRevisao(m.id);
    return m.id;
  }
  it('jornalista não aprova (sem-acesso)', async () => {
    const id = await pendenteDeA2();
    login(['jornalista']);
    await expect(aprovarMateria(id)).rejects.toThrow('REDIRECT:/sem-acesso');
  });
  it('diretor aprova pendente → publicada', async () => {
    const id = await pendenteDeA2();
    login(['diretor']);
    await aprovarMateria(id);
    expect((await repositories.materias.getById(id))?.status).toBe('publicada');
  });
  it('aprovar não-pendente falha', async () => {
    const id = await pendenteDeA2();
    login(['diretor']);
    await aprovarMateria(id); // publicada
    await expect(aprovarMateria(id)).rejects.toThrow(/pendentes/i);
  });
  it('recusar sem justificativa é bloqueado; com justificativa recusa', async () => {
    const id = await pendenteDeA2();
    login(['diretor']);
    const vazio = await recusarMateria(id, '   ');
    expect(vazio.ok).toBe(false);
    const ok = await recusarMateria(id, 'Faltou fonte');
    expect(ok.ok).toBe(true);
    expect((await repositories.materias.getById(id))?.status).toBe('recusada');
  });
});

describe('modo automático', () => {
  it('diretor liga/desliga; editoria inválida falha; jornalista barrado', async () => {
    login(['diretor']);
    await definirModoAutomatico('economia', true);
    const modos = await repositories.config.getModoAutomatico();
    expect(modos.find((m) => m.categoria === 'economia')?.ativo).toBe(true);
    await definirModoAutomatico('economia', false); // cleanup
    await expect(definirModoAutomatico('zzz', true)).rejects.toThrow(/inválida/i);
    login(['jornalista']);
    await expect(definirModoAutomatico('economia', true)).rejects.toThrow('REDIRECT:/sem-acesso');
  });
});

describe('reabrir para correção — action', () => {
  it('dona reabre → redireciona ao editor do draft', async () => {
    const pub = await publicarDeA2();
    login(['jornalista']); // a-2 dona
    await expect(reabrirParaCorrecao(pub.id)).rejects.toThrow(/^REDIRECT:\/jornalista\/materia\//);
  });
  it('não-dono não reabre', async () => {
    const pub = await publicarDeA2();
    login(['jornalista'], 'a-9');
    await expect(reabrirParaCorrecao(pub.id)).rejects.toThrow(/suas próprias/i);
  });
});

describe('criar usuário — só admin + validação', () => {
  function fd(email: string, nome: string, grupo: string) {
    const f = new FormData();
    f.set('email', email);
    f.set('nome', nome);
    f.set('grupo', grupo);
    return f;
  }
  it('jornalista não cria usuário', async () => {
    login(['jornalista']);
    await expect(
      criarUsuarioAction({ ok: false }, fd('a@b.com', 'A', 'jornalista')),
    ).rejects.toThrow('REDIRECT:/sem-acesso');
  });
  it('admin cria usuário válido', async () => {
    login(['admin']);
    h.criarUsuarioStub.mockClear();
    const r = await criarUsuarioAction({ ok: false }, fd('novo@lupa.dev', 'Novo', 'jornalista'));
    expect(r.ok).toBe(true);
    expect(h.criarUsuarioStub).toHaveBeenCalledOnce();
  });
  it('e-mail inválido é rejeitado', async () => {
    login(['admin']);
    const r = await criarUsuarioAction({ ok: false }, fd('nao-email', 'X', 'jornalista'));
    expect(r.ok).toBe(false);
    expect(r.erro).toBeTruthy();
  });
});
