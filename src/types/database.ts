import type { RecordModel } from 'pocketbase'

export type ProductCategory = 'decoracao' | 'joia' | 'kit' | 'acessorio' | 'base' | 'outros'
export type ProductUnit = 'unidade' | 'peso'

/** Pedras que podem compor um produto (multi-select, opcional). */
export type ProductStone =
  | 'ametista'
  | 'agata'
  | 'pirita'
  | 'selenita'
  | 'cianita'
  | 'quartzo'
  | 'obsidiana'
  | 'outras'

export type ProductStatus = 'disponivel' | 'esgotado'

export interface Product extends RecordModel {
  name: string
  description?: string
  quantity: number
  unit: ProductUnit
  cost: number
  price: number
  promo_price?: number
  category: ProductCategory
  /** Pedras que compõem o produto (opcional, vazio para base/led/sacola etc.) */
  stones?: ProductStone[]
  status?: ProductStatus
  created: string
  updated: string
}

export type SaleChannel = 'instagram' | 'whatsapp' | 'loja_online' | 'fisico'

export type SaleStatus = 'concluida' | 'pendente' | 'cancelada'

export interface Sale extends RecordModel {
  /** Legado: vendas de item único (novas vendas usam sale_items) */
  product?: string
  quantity?: number
  customer?: string
  status?: SaleStatus
  /** JSON string com os itens enviados no registro da venda (uso do pb_hook) */
  items?: string
  total: number
  channel: SaleChannel
  date: string
  created: string
  updated: string
}

export interface SaleItem extends RecordModel {
  sale: string
  product: string
  quantity: number
  unit_price: number
  subtotal: number
  created: string
  updated: string
  expand?: {
    product?: Product
  }
}

export type MovementType = 'entrada' | 'saida'

/** Categorias de movimentação financeira (ordem fixa definida pelo usuário). */
export type MovementCategory =
  | 'compra_produtos'
  | 'aporte_socio'
  | 'aporte_investidor'
  | 'despesa_operacional'
  | 'marketing'
  | 'outro'

export const movementCategories: MovementCategory[] = [
  'compra_produtos',
  'aporte_socio',
  'aporte_investidor',
  'despesa_operacional',
  'marketing',
  'outro',
]

export const movementCategoryLabels: Record<MovementCategory, string> = {
  compra_produtos: 'Compra de Produtos',
  aporte_socio: 'Aporte de Sócio',
  aporte_investidor: 'Aporte de Investidor',
  despesa_operacional: 'Despesa Operacional',
  marketing: 'Marketing',
  outro: 'Outro',
}

export interface Movement extends RecordModel {
  type: MovementType
  amount: number
  description: string
  date: string
  category?: MovementCategory
  /** Produtos do estoque vinculados (usado em compras de produtos) */
  products?: string[]
  created: string
  updated: string
  expand?: {
    products?: Product[]
  }
}

/** Configurações simples chave/valor (ex.: percentual da reserva da empresa). */
export interface Setting extends RecordModel {
  key: string
  value: string
  created: string
  updated: string
}

export type UserRole = 'admin' | 'gestor'

export interface UserProfile extends RecordModel {
  name?: string
  email: string
  avatar?: string
  verified: boolean
  role?: UserRole
}
