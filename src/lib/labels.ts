import type { ProductCategory, ProductUnit } from '@/types/database'

export const categoryLabels: Record<ProductCategory, string> = {
  ametista: 'Ametista',
  quartzo: 'Quartzo',
  decoracao: 'Decoração',
  joia: 'Joia',
  outros: 'Outros',
}

export const unitLabels: Record<ProductUnit, string> = {
  unidade: 'un.',
  peso: 'kg',
}

export type SaleChannel = 'instagram' | 'whatsapp' | 'loja_online' | 'fisico'

export const channelLabels: Record<SaleChannel, string> = {
  instagram: 'Instagram',
  whatsapp: 'WhatsApp',
  loja_online: 'Loja Online',
  fisico: 'Loja Físico',
}
