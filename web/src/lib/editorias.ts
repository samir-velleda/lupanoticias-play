import type { EditoriaSlug } from '@/types';

/**
 * Rótulos canônicos das editorias (union fixa de slugs — DATA_MODEL §1).
 * Independe da fonte de dados; serve para labels de UI sem buscar no repositório.
 */
export const EDITORIA_NOME: Record<EditoriaSlug, string> = {
  politica: 'Política',
  economia: 'Economia',
  mundo: 'Mundo',
  esportes: 'Esportes',
  cultura: 'Cultura',
  tecnologia: 'Tecnologia',
  ciencia: 'Ciência',
  saude: 'Saúde',
  cidades: 'Cidades',
  opiniao: 'Opinião',
};

export const EDITORIA_SLUGS = Object.keys(EDITORIA_NOME) as EditoriaSlug[];

export function editoriaNome(slug: EditoriaSlug): string {
  return EDITORIA_NOME[slug] ?? slug;
}

export function isEditoriaSlug(v: string): v is EditoriaSlug {
  return v in EDITORIA_NOME;
}
