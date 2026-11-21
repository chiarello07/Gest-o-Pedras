import type { RecordModel } from 'pocketbase'

export type ProductCategory = 'ametista' | 'quartzo' | 'decoracao' | 'joia' | 'outros'
export type ProductUnit = 'unidade' | 'peso'

export interface Product extends RecordModel {
  name: string
  description?: string
  quantity: number
  unit: ProductUnit
  cost: number
  price: number
  promo_price?: number
  category: ProductCategory
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

export interface UserProfile extends RecordModel {
  name?: string
  email: string
  avatar?: string
  verified: boolean
}
