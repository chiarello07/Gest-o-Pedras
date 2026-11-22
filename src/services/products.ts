import pb from '@/lib/pocketbase/client'
import type { Product, ProductCategory, ProductUnit } from '@/types/database'

export interface CreateProductInput {
  name: string
  description?: string
  quantity: number
  unit: ProductUnit
  cost: number
  price: number
  promo_price?: number | null
  category: ProductCategory
  stones?: string[]
}

export interface UpdateProductInput extends Partial<CreateProductInput> {}

export async function getProducts(options?: {
  filter?: string
  sort?: string
}): Promise<Product[]> {
  return pb.collection('products').getFullList<Product>({
    filter: options?.filter,
    sort: options?.sort || '-created',
  })
}

export async function getProductById(id: string): Promise<Product> {
  return pb.collection('products').getOne<Product>(id)
}

export async function createProduct(data: CreateProductInput): Promise<Product> {
  const payload: Record<string, unknown> = {
    name: data.name,
    description: data.description || '',
    quantity: Number(data.quantity) || 0,
    unit: data.unit,
    cost: Number(data.cost) || 0,
    price: Number(data.price) || 0,
    category: data.category,
    stones: data.stones ?? [],
  }

  if (
    data.promo_price !== undefined &&
    data.promo_price !== null &&
    data.promo_price !== ('' as unknown)
  ) {
    payload.promo_price = Number(data.promo_price)
  } else {
    payload.promo_price = 0
  }

  return pb.collection('products').create<Product>(payload)
}

export async function updateProduct(id: string, data: UpdateProductInput): Promise<Product> {
  const payload: Record<string, unknown> = { ...data }
  if (payload.quantity !== undefined) payload.quantity = Number(payload.quantity) || 0
  if (payload.cost !== undefined) payload.cost = Number(payload.cost) || 0
  if (payload.price !== undefined) payload.price = Number(payload.price) || 0
  if (payload.promo_price !== undefined) {
    if (payload.promo_price === null || payload.promo_price === ('' as unknown)) {
      payload.promo_price = 0
    } else {
      payload.promo_price = Number(payload.promo_price)
    }
  }

  return pb.collection('products').update<Product>(id, payload)
}

export async function deleteProduct(id: string): Promise<boolean> {
  return pb.collection('products').delete(id)
}
