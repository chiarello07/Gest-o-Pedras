import type { ProductCategory, ProductUnit } from '@/types/database'

export const categoryLabels: Record<ProductCategory, string> = {
  decoracao: 'Decoração',
  joia: 'Joia',
  kit: 'Kit',
  acessorio: 'Acessório',
  base: 'Base',
  outros: 'Outros',
}

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

export type SaleChannel = 'instagram' | 'whatsapp' | 'loja_online' | 'fisico'

export const channelLabels: Record<SaleChannel, string> = {
  instagram: 'Instagram',
  whatsapp: 'WhatsApp',
  loja_online: 'Loja Online',
  fisico: 'Loja Físico',
}
