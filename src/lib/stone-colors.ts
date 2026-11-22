import type { Stone } from '@/types/database'

interface TagColor {
  bg: string
  text: string
  border: string
}

/** Paleta de tags no mesmo estilo das tags fixas anteriores. */
const TAG_PALETTE: TagColor[] = [
  { bg: '#EFE9F7', text: '#6B4FA0', border: '#D8C7F0' }, // roxo
  { bg: '#FBEAEF', text: '#A8446A', border: '#F0C4D3' }, // rosa
  { bg: '#F7EBEA', text: '#B3452F', border: '#EBBBB3' }, // vermelho
  { bg: '#FAF3E0', text: '#8E7118', border: '#EED69E' }, // dourado
  { bg: '#EDF2FA', text: '#3D6B9E', border: '#C4D6EE' }, // azul
  { bg: '#E8F2F4', text: '#2F6D7C', border: '#BFDDE3' }, // ciano
  { bg: '#EFF3F0', text: '#3E7C4F', border: '#C7DBCF' }, // verde
  { bg: '#ECECEC', text: '#444444', border: '#CCCCCC' }, // cinza
  { bg: '#FBF3E4', text: '#A8861D', border: '#EED69E' }, // âmbar
  { bg: '#F3EDF9', text: '#8B5E9E', border: '#E0CDEB' }, // lilás
]

/** Hash estável de string (djb2) — mesmo nome sempre cai na mesma cor. */
function hashString(value: string): number {
  let hash = 5381
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 33) ^ value.charCodeAt(i)
  }
  return Math.abs(hash)
}

/**
 * Cor da tag de pedra: usa `stone.color` quando o registro tem cor própria,
 * senão deriva deterministicamente da paleta pelo nome.
 */
export function stoneTagColor(stone: Pick<Stone, 'name' | 'color'>): TagColor {
  if (stone.color) return { bg: '#F5F2EC', text: stone.color, border: stone.color + '55' }

  const idx = hashString(stone.name.toLowerCase()) % TAG_PALETTE.length
  return TAG_PALETTE[idx]
}

/** Variante que aceita só o nome (quando o registro da pedra não está carregado). */
export function stoneTagColorByName(name: string): TagColor {
  const idx = hashString(name.toLowerCase()) % TAG_PALETTE.length
  return TAG_PALETTE[idx]
}
