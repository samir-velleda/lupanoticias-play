/**
 * Implementação MOCK do contrato `Repositories`, em memória.
 * Determinística no boot (dados de `data.ts`); mutações (criar/aprovar/etc.) valem
 * durante a vida do processo. Trocada por Aurora nos prompts 06–07 sem tocar a UI.
 */
import type { Repositories } from '../repositories';
import type {
  AdCampaign,
  AdCreative,
  AdMetrics,
  AdSlotId,
  Author,
  CreateMediaInput,
  CriarMateriaInput,
  Editoria,
  EditoriaSlug,
  EventoAnalytics,
  Materia,
  Media,
  MediaTipo,
  ModoAutomatico,
  Paged,
  PageOpts,
  Pauta,
  RelatorioOpts,
  RelatorioResultado,
  RevisaoMateria,
  StatusMateria,
} from '@/types';
import {
  adCampaigns,
  adCreatives,
  authors,
  editoriaNome,
  editorias,
  materias as seedMaterias,
  medias,
  modoAutomatico,
  pautas,
  playlists,
} from './data';

// ---- estado mutável em memória (cópias dos seeds) ----
const _materias: Materia[] = seedMaterias.map((m) => ({ ...m }));
const _medias: Media[] = medias.map((m) => ({ ...m }));
const _pautas: Pauta[] = pautas.map((p) => ({ ...p }));
const _modo: ModoAutomatico[] = modoAutomatico.map((m) => ({ ...m }));
const _campanhas: AdCampaign[] = adCampaigns.map((c) => ({ ...c }));
const _criativos: AdCreative[] = adCreatives.map((c) => ({ ...c }));
const _revisoes: RevisaoMateria[] = [];
const _eventos: Omit<EventoAnalytics, 'id' | 'criadoEm'>[] = [];

let _seq = 1000;
const nextId = (prefixo: string) => `${prefixo}-${++_seq}`;
const agora = () => new Date().toISOString();

// ---- helpers ----
const publicadas = () => _materias.filter((m) => m.status === 'publicada');

const ordDesc = (a?: string, b?: string) =>
  (b ?? '').localeCompare(a ?? '');

function paginate<T>(items: T[], opts?: PageOpts): Paged<T> {
  const page = Math.max(1, opts?.page ?? 1);
  const pageSize = Math.max(1, opts?.pageSize ?? 10);
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page,
    pageSize,
    total: items.length,
  };
}

const clone = <T>(v: T): T => (v ? JSON.parse(JSON.stringify(v)) : v);

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export function createMockRepositories(): Repositories {
  return {
    materias: {
      async getById(id: string) {
        return clone(_materias.find((m) => m.id === id)) ?? null;
      },
      async getBySlug(editoria: EditoriaSlug, slug: string) {
        return (
          clone(_materias.find((m) => m.editoria === editoria && m.slug === slug)) ?? null
        );
      },
      async listByEditoria(editoria: EditoriaSlug, opts?: PageOpts) {
        const items = publicadas()
          .filter((m) => m.editoria === editoria)
          .sort((a, b) => ordDesc(a.publishedAt, b.publishedAt));
        return paginate(clone(items), opts);
      },
      async listMaisLidas(limit = 5) {
        return clone(
          publicadas()
            .slice()
            .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
            .slice(0, limit),
        );
      },
      async listOpiniao(limit = 3) {
        return clone(
          publicadas()
            .filter((m) => m.editoria === 'opiniao')
            .sort((a, b) => ordDesc(a.publishedAt, b.publishedAt))
            .slice(0, limit),
        );
      },
      async listRelated(materiaId: string, limit = 3) {
        const base = _materias.find((m) => m.id === materiaId);
        if (!base) return [];
        return clone(
          publicadas()
            .filter((m) => m.id !== materiaId && m.editoria === base.editoria)
            .sort((a, b) => ordDesc(a.publishedAt, b.publishedAt))
            .slice(0, limit),
        );
      },
      async listMinhas(autorId: string, status?: StatusMateria) {
        return clone(
          _materias.filter(
            (m) =>
              m.autores.some((a) => a.id === autorId) &&
              (status ? m.status === status : true),
          ),
        );
      },
      async listPendentes(opts?: PageOpts) {
        const items = _materias
          .filter((m) => m.status === 'pendente')
          .sort((a, b) => ordDesc(a.updatedAt, b.updatedAt));
        return paginate(clone(items), opts);
      },
      async criar(input: CriarMateriaInput) {
        const autor: Author =
          (input.autorId ? authors.find((a) => a.id === input.autorId) : undefined) ??
          authors.find((a) => a.papel === 'jornalista') ??
          authors[0];
        const nova: Materia = {
          id: nextId('m'),
          slug: slugify(input.titulo),
          editoria: input.editoria,
          titulo: input.titulo,
          standfirst: input.standfirst,
          corpo: input.corpo,
          autores: [autor],
          heroImageUrl: input.heroImageUrl,
          heroCaption: input.heroCaption,
          tags: input.tags,
          status: 'rascunho',
          pautaId: input.pautaId,
          agendadoPara: input.agendadoPara,
          updatedAt: agora(),
          views: 0,
          cliques: 0,
        };
        _materias.push(nova);
        return clone(nova);
      },
      async atualizar(id: string, input: Partial<CriarMateriaInput>) {
        const m = _materias.find((x) => x.id === id);
        if (!m) throw new Error(`Matéria ${id} não encontrada`);
        const { autorId, ...rest } = input;
        Object.assign(m, rest, { updatedAt: agora() });
        if (input.titulo) m.slug = slugify(input.titulo);
        if (autorId) {
          const autor = authors.find((a) => a.id === autorId);
          if (autor) m.autores = [autor];
        }
        return clone(m);
      },
      async enviarParaRevisao(id: string) {
        const m = _materias.find((x) => x.id === id);
        if (!m) throw new Error(`Matéria ${id} não encontrada`);
        const auto = _modo.find((x) => x.categoria === m.editoria)?.ativo;
        if (auto) {
          m.status = 'publicada';
          m.publishedAt = agora();
        } else {
          m.status = 'pendente';
        }
        m.updatedAt = agora();
        return clone(m);
      },
      async aprovar(id: string, revisorId: string, agendadoPara?: string) {
        const m = _materias.find((x) => x.id === id);
        if (!m) throw new Error(`Matéria ${id} não encontrada`);
        if (agendadoPara) {
          m.status = 'aprovada';
          m.agendadoPara = agendadoPara;
        } else {
          m.status = 'publicada';
          m.publishedAt = agora();
        }
        m.updatedAt = agora();
        _revisoes.push({
          id: nextId('rev'),
          materiaId: id,
          revisorId,
          decisao: 'aprovada',
          criadoEm: agora(),
        });
        return clone(m);
      },
      async recusar(id: string, revisorId: string, justificativa: string) {
        if (!justificativa || !justificativa.trim()) {
          throw new Error('Justificativa é obrigatória para recusar uma matéria.');
        }
        const m = _materias.find((x) => x.id === id);
        if (!m) throw new Error(`Matéria ${id} não encontrada`);
        m.status = 'recusada';
        m.updatedAt = agora();
        _revisoes.push({
          id: nextId('rev'),
          materiaId: id,
          revisorId,
          decisao: 'recusada',
          justificativa,
          criadoEm: agora(),
        });
        return clone(m);
      },
      async listRevisoes(materiaId: string) {
        return clone(_revisoes.filter((r) => r.materiaId === materiaId));
      },
    },

    pautas: {
      async listAbertas(autorId?: string) {
        return clone(
          _pautas.filter(
            (p) =>
              (p.status === 'aberta' || p.status === 'em_producao') &&
              (autorId ? p.atribuidos.includes(autorId) : true),
          ),
        );
      },
      async criar(input) {
        const nova: Pauta = {
          ...input,
          id: nextId('pt'),
          status: 'aberta',
          criadoEm: agora(),
        };
        _pautas.push(nova);
        return clone(nova);
      },
      async atualizar(id: string, input: Partial<Pauta>) {
        const p = _pautas.find((x) => x.id === id);
        if (!p) throw new Error(`Pauta ${id} não encontrada`);
        Object.assign(p, input);
        return clone(p);
      },
    },

    config: {
      async getModoAutomatico() {
        return clone(_modo);
      },
      async setModoAutomatico(categoria: EditoriaSlug, ativo: boolean, porId: string) {
        const entry = _modo.find((m) => m.categoria === categoria);
        if (entry) {
          entry.ativo = ativo;
          entry.ativadoPor = porId;
          entry.ativadoEm = agora();
        } else {
          _modo.push({ categoria, ativo, ativadoPor: porId, ativadoEm: agora() });
        }
      },
    },

    media: {
      async getById(id: string) {
        return clone(_medias.find((m) => m.id === id)) ?? null;
      },
      async listByTipo(tipo: MediaTipo, opts?: PageOpts) {
        const items = _medias
          .filter((m) => m.tipo === tipo && m.visibilidade === 'publico' && m.status === 'pronto')
          .sort((a, b) => ordDesc(a.publishedAt, b.publishedAt));
        return paginate(clone(items), opts);
      },
      async listByEditoria(editoria: EditoriaSlug, opts?: PageOpts) {
        const items = _medias
          .filter((m) => m.editoria === editoria && m.visibilidade === 'publico')
          .sort((a, b) => ordDesc(a.publishedAt, b.publishedAt));
        return paginate(clone(items), opts);
      },
      async getLiveDestaque() {
        return (
          clone(
            _medias.find((m) => m.tipo === 'live' && m.destaque && m.status === 'pronto'),
          ) ?? null
        );
      },
      async listPlayShelf() {
        return clone(playlists);
      },
      async listCortes(opts?: PageOpts) {
        const items = _medias
          .filter((m) => m.tipo === 'short' && m.status === 'pronto')
          .sort((a, b) => ordDesc(a.publishedAt, b.publishedAt));
        return paginate(clone(items), opts);
      },
      async getNext(id: string, limit = 4) {
        const base = _medias.find((m) => m.id === id);
        const pool = _medias.filter(
          (m) => m.id !== id && m.status === 'pronto' && m.tipo !== 'live',
        );
        const mesmaEditoria = base
          ? pool.filter((m) => m.editoria === base.editoria)
          : [];
        const resto = pool.filter((m) => !mesmaEditoria.includes(m));
        return clone([...mesmaEditoria, ...resto].slice(0, limit));
      },
      async criarUpload(input: CreateMediaInput) {
        const autor = authors.find((a) => a.papel === 'jornalista') ?? authors[0];
        const nova: Media = {
          id: nextId('media'),
          tipo: input.tipo,
          titulo: input.titulo,
          descricao: input.descricao,
          editoria: input.editoria,
          autor,
          coverUrl: input.coverUrl,
          publishedAt: agora(),
          visibilidade: input.visibilidade,
          agendadoPara: input.agendadoPara,
          destaque: input.destaque,
          transcricao: input.transcricaoAuto,
          legendasVTT: input.gerarLegendasVTT,
          status: 'processando',
          views: 0,
          likes: 0,
        };
        _medias.push(nova);
        return clone(nova);
      },
    },

    ads: {
      async servir(slot: AdSlotId) {
        const ativos = _criativos
          .filter((c) => c.slot === slot && c.ativo)
          .sort((a, b) => b.peso - a.peso);
        return clone(ativos[0]) ?? null;
      },
      async registrarImpressao(creativeId: string) {
        const c = _criativos.find((x) => x.id === creativeId);
        if (c) c.impressoes = (c.impressoes ?? 0) + 1;
      },
      async registrarClique(creativeId: string) {
        const c = _criativos.find((x) => x.id === creativeId);
        if (c) c.cliques = (c.cliques ?? 0) + 1;
      },
      async listCampanhas() {
        return clone(_campanhas);
      },
      async upsertCampanha(c: AdCampaign) {
        const i = _campanhas.findIndex((x) => x.id === c.id);
        if (i >= 0) _campanhas[i] = { ...c };
        else _campanhas.push({ ...c });
        return clone(c);
      },
      async upsertCriativo(c: AdCreative) {
        const i = _criativos.findIndex((x) => x.id === c.id);
        if (i >= 0) _criativos[i] = { ...c };
        else _criativos.push({ ...c });
        return clone(c);
      },
      async metricas(_opts: RelatorioOpts): Promise<AdMetrics[]> {
        return _criativos.map((c) => {
          const impressoes = c.impressoes ?? 0;
          const cliques = c.cliques ?? 0;
          return {
            creativeId: c.id,
            campanhaId: c.campanhaId,
            slot: c.slot,
            impressoes,
            cliques,
            ctr: impressoes > 0 ? cliques / impressoes : 0,
          };
        });
      },
    },

    analytics: {
      async ingest(evt: Omit<EventoAnalytics, 'id' | 'criadoEm'>) {
        _eventos.push(evt);
      },
      async relatorio(opts: RelatorioOpts): Promise<RelatorioResultado> {
        const base = publicadas().filter((m) =>
          opts.categoria ? m.editoria === opts.categoria : true,
        );
        const linhas = base
          .map((m) => ({
            entidadeId: m.id,
            rotulo: m.titulo,
            categoria: m.editoria,
            views: m.views ?? 0,
            cliques: m.cliques ?? 0,
          }))
          .sort((a, b) => b.views - a.views);
        return {
          de: opts.de,
          ate: opts.ate,
          totalViews: linhas.reduce((s, l) => s + l.views, 0),
          totalCliques: linhas.reduce((s, l) => s + l.cliques, 0),
          linhas,
        };
      },
    },

    editorias: {
      async list(): Promise<Editoria[]> {
        return clone(editorias);
      },
      async get(slug: EditoriaSlug) {
        return clone(editorias.find((e) => e.slug === slug)) ?? null;
      },
    },

    authors: {
      async getById(id: string) {
        return clone(authors.find((a) => a.id === id)) ?? null;
      },
      async ensureFromCognito(input) {
        // Mock: reutiliza autor demo por papel (sem Cognito real local).
        const porPapel =
          authors.find((a) => a.papel === input.papel) ??
          authors.find((a) => a.papel === 'jornalista') ??
          authors[0];
        return clone({ ...porPapel, nome: input.nome ?? porPapel.nome });
      },
    },
  };
}

// reexport util para a UI mock (nome de editoria por slug)
export { editoriaNome };
