import type {
  Author,
  ArticleBlock,
  Editoria,
  EditoriaSlug,
  Materia,
  Media,
  MediaTipo,
  ModoAutomatico,
  Pauta,
  RevisaoMateria,
  StatusMateria,
  Visibilidade,
  AdCampaign,
  AdCreative,
} from '@/types';

/** Linha do pg (colunas snake_case, valores já convertidos pelo driver). */
export type Row = Record<string, unknown>;

// ---- coerção segura (sem `any`) ----
const str = (v: unknown): string => (v == null ? '' : String(v));
const strOpt = (v: unknown): string | undefined => (v == null ? undefined : String(v));
const numOpt = (v: unknown): number | undefined => (v == null ? undefined : Number(v));
const num0 = (v: unknown): number => (v == null ? 0 : Number(v));
const bool = (v: unknown): boolean => v === true || v === 't' || v === 'true';
const boolOpt = (v: unknown): boolean | undefined =>
  v == null ? undefined : bool(v);
/** timestamptz (Date do driver) → ISO string. */
const iso = (v: unknown): string | undefined => {
  if (v == null) return undefined;
  if (v instanceof Date) return v.toISOString();
  return String(v);
};

export function mapAuthor(r: Row): Author {
  return {
    id: str(r.id),
    nome: str(r.nome),
    bio: strOpt(r.bio),
    avatarUrl: strOpt(r.avatar_url),
    papel: str(r.papel) as Author['papel'],
  };
}

export function mapEditoria(r: Row): Editoria {
  return {
    slug: str(r.slug) as EditoriaSlug,
    nome: str(r.nome),
    descricao: str(r.descricao),
  };
}

export function mapMateria(r: Row): Materia {
  // `autores` vem como json_agg (array de objetos camelCase) ou null.
  const autoresRaw = Array.isArray(r.autores) ? (r.autores as Row[]) : [];
  const autores: Author[] = autoresRaw.map((a) => ({
    id: str(a.id),
    nome: str(a.nome),
    bio: strOpt(a.bio),
    avatarUrl: strOpt(a.avatarUrl),
    papel: str(a.papel) as Author['papel'],
  }));
  const corpo = Array.isArray(r.corpo) ? (r.corpo as ArticleBlock[]) : [];
  const tags = Array.isArray(r.tags) ? (r.tags as string[]) : [];
  return {
    id: str(r.id),
    slug: str(r.slug),
    editoria: str(r.editoria) as EditoriaSlug,
    titulo: str(r.titulo),
    standfirst: str(r.standfirst),
    corpo,
    autores,
    heroImageUrl: strOpt(r.hero_image_url),
    heroCaption: strOpt(r.hero_caption),
    tags,
    status: str(r.status) as StatusMateria,
    pautaId: strOpt(r.pauta_id),
    publishedAt: iso(r.published_at),
    updatedAt: iso(r.updated_at),
    agendadoPara: iso(r.agendado_para),
    readingMinutes: numOpt(r.reading_minutes),
    relatedMediaId: strOpt(r.related_media_id),
    views: num0(r.views),
    cliques: num0(r.cliques),
  };
}

export function mapMedia(r: Row): Media {
  const autor: Author | undefined = r.autor_id
    ? {
        id: str(r.autor_id),
        nome: str(r.autor_nome),
        bio: strOpt(r.autor_bio),
        avatarUrl: strOpt(r.autor_avatar_url),
        papel: str(r.autor_papel) as Author['papel'],
      }
    : undefined;
  return {
    id: str(r.id),
    tipo: str(r.tipo) as MediaTipo,
    titulo: str(r.titulo),
    descricao: strOpt(r.descricao),
    editoria: str(r.editoria) as EditoriaSlug,
    autor,
    playbackUrl: strOpt(r.playback_url),
    coverUrl: strOpt(r.cover_url),
    duracaoSeg: numOpt(r.duracao_seg),
    publishedAt: iso(r.published_at) ?? '',
    visibilidade: str(r.visibilidade) as Visibilidade,
    agendadoPara: iso(r.agendado_para),
    destaque: bool(r.destaque),
    transcricao: boolOpt(r.transcricao),
    legendasVTT: boolOpt(r.legendas_vtt),
    status: str(r.status) as Media['status'],
    views: num0(r.views),
    likes: num0(r.likes),
    liveViewers: numOpt(r.live_viewers),
  };
}

export function mapPauta(r: Row): Pauta {
  const atribuidos = Array.isArray(r.atribuidos)
    ? (r.atribuidos as unknown[]).map(String)
    : [];
  return {
    id: str(r.id),
    tema: str(r.tema),
    descricao: str(r.descricao),
    categoriaSugerida: strOpt(r.categoria_sugerida) as EditoriaSlug | undefined,
    prioridade: str(r.prioridade) as Pauta['prioridade'],
    prazo: iso(r.prazo),
    atribuidos,
    status: str(r.status) as Pauta['status'],
    criadoPor: str(r.criado_por),
    criadoEm: iso(r.criado_em) ?? '',
  };
}

export function mapRevisao(r: Row): RevisaoMateria {
  return {
    id: str(r.id),
    materiaId: str(r.materia_id),
    revisorId: str(r.revisor_id),
    decisao: str(r.decisao) as RevisaoMateria['decisao'],
    justificativa: strOpt(r.justificativa),
    criadoEm: iso(r.criado_em) ?? '',
  };
}

export function mapModo(r: Row): ModoAutomatico {
  return {
    categoria: str(r.categoria) as EditoriaSlug,
    ativo: bool(r.ativo),
    ativadoPor: strOpt(r.ativado_por),
    ativadoEm: iso(r.ativado_em),
  };
}

export function mapAdCampaign(r: Row): AdCampaign {
  return {
    id: str(r.id),
    nome: str(r.nome),
    anunciante: str(r.anunciante),
    inicio: iso(r.inicio) ?? '',
    fim: iso(r.fim) ?? '',
    status: str(r.status) as AdCampaign['status'],
    ativadoPor: str(r.ativado_por),
  };
}

export function mapAdCreative(r: Row): AdCreative {
  return {
    id: str(r.id),
    campanhaId: str(r.campanha_id),
    slot: str(r.slot) as AdCreative['slot'],
    tipoMidia: str(r.tipo_midia) as AdCreative['tipoMidia'],
    assetUrl: str(r.asset_url),
    linkDestino: str(r.link_destino),
    peso: num0(r.peso),
    ativo: bool(r.ativo),
    impressoes: num0(r.impressoes),
    cliques: num0(r.cliques),
  };
}
