import type { RecordModel } from 'pocketbase'

export type ProductCategory = 'ametista' | 'quartzo' | 'decoracao' | 'joia' | 'outros'
export type ProductUnit = 'unidade' | 'peso'

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
  status?: ProductStatus
  created: string
  updated: string
}

export type SaleChannel = 'instagram' | 'whatsapp' | 'loja_online' | 'fisico'

export interface Sale extends RecordModel {
  product: string
  quantity: number
  total: number
  channel: SaleChannel
  date: string
  created: string
  updated: string
}

export type MovementType = 'entrada' | 'saida'

export interface Movement extends RecordModel {
  type: MovementType
  amount: number
  description: string
  date: string
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
