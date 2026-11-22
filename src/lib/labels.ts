import type { ProductCategory, ProductStone, ProductUnit } from '@/types/database'

export const categoryLabels: Record<ProductCategory, string> = {
  decoracao: 'Decoração',
  joia: 'Joia',
  kit: 'Kit',
  acessorio: 'Acessório',
  base: 'Base',
  outros: 'Outros',
}

export const stoneLabels: Record<ProductStone, string> = {
  ametista: 'Ametista',
  agata: 'Ágata',
  pirita: 'Pirita',
  selenita: 'Selenita',
  cianita: 'Cianita',
  quartzo: 'Quartzo',
  obsidiana: 'Obsidiana',
  outras: 'Outras',
}

/** Lista de pedras na ordem definida pelo usuário. */
export const stoneOptions: ProductStone[] = [
  'ametista',
  'agata',
  'pirita',
  'selenita',
  'cianita',
  'quartzo',
  'obsidiana',
  'outras',
]

export const unitLabels: Record<ProductUnit, string> = {
  unidade: 'un.',
  peso: 'kg',
}

type TagStyle = { bg: string; text: string; border: string }

export const categoryStyles: Record<ProductCategory, TagStyle> = {
  decoracao: { bg: '#FBF3E4', text: '#A8861D', border: '#EED69E' },
  joia: { bg: '#F7EBEA', text: '#B3452F', border: '#EBBBB3' },
  kit: { bg: '#EFE9F7', text: '#6B4FA0', border: '#D8C7F0' },
  acessorio: { bg: '#EDF2FA', text: '#3D6B9E', border: '#C4D6EE' },
  base: { bg: '#F0F2F1', text: '#55665C', border: '#D0D8D4' },
  outros: { bg: '#F0F2F1', text: '#55665C', border: '#D0D8D4' },
}

export const stoneStyles: Record<ProductStone, TagStyle> = {
  ametista: { bg: '#EFE9F7', text: '#6B4FA0', border: '#D8C7F0' },
  agata: { bg: '#F7EBEA', text: '#B3452F', border: '#EBBBB3' },
  pirita: { bg: '#FAF3E0', text: '#8E7118', border: '#EED69E' },
  selenita: { bg: '#EDF2FA', text: '#3D6B9E', border: '#C4D6EE' },
  cianita: { bg: '#E8F2F4', text: '#2F6D7C', border: '#BFDDE3' },
  quartzo: { bg: '#EFF3F0', text: '#3E7C4F', border: '#C7DBCF' },
  obsidiana: { bg: '#ECECEC', text: '#444444', border: '#CCCCCC' },
  outras: { bg: '#F0F2F1', text: '#55665C', border: '#D0D8D4' },
}

export type SaleChannel = 'instagram' | 'whatsapp' | 'loja_online' | 'fisico'

export const channelLabels: Record<SaleChannel, string> = {
  instagram: 'Instagram',
  whatsapp: 'WhatsApp',
  loja_online: 'Loja Online',
  fisico: 'Loja Físico',
}
