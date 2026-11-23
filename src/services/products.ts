import pb from '@/lib/pocketbase/client'
import type { Product, ProductType } from '@/types/database'

const PRODUCTS_COLLECTION = 'products'

export interface CreateProductInput {
  name: string
  description?: string
  quantity: number
  unit: 'unidade' | 'peso'
  cost: number
  price: number
  promo_price?: number
  category: string
  stones?: string[]
  product_type?: ProductType
  components?: string[]
}

export interface UpdateProductInput extends Partial<CreateProductInput> {}

export async function getProducts(options?: {
  filter?: string
  sort?: string
  expand?: string
}): Promise<Product[]> {
  return pb.collection(PRODUCTS_COLLECTION).getFullList<Product>({
    sort: options?.sort || '-created',
    filter: options?.filter,
    expand: options?.expand,
  })
}

export async function getProductById(id: string, options?: { expand?: string }): Promise<Product> {
  return pb.collection(PRODUCTS_COLLECTION).getOne<Product>(id, {
    expand: options?.expand,
  })
}

/**
 * Monta a carga útil do produto: kits não têm estoque próprio
 * (quantity=0) e o preço/custo próprios são mantidos como digitados.
 */
function buildPayload(input: Partial<CreateProductInput>) {
  const productType: ProductType = input.product_type === 'kit' ? 'kit' : 'individual'
  const isKit = productType === 'kit'
  return {
    name: input.name,
    description: input.description || '',
    quantity: isKit ? 0 : Number(input.quantity) || 0,
    unit: input.unit,
    cost: Number(input.cost) || 0,
    price: Number(input.price) || 0,
    promo_price: input.promo_price ? Number(input.promo_price) : 0,
    category: input.category,
    stones: input.stones || [],
    product_type: productType,
    components: isKit ? input.components || [] : [],
  }
}

export async function createProduct(input: CreateProductInput): Promise<Product> {
  return pb.collection(PRODUCTS_COLLECTION).create(buildPayload(input))
}

export async function updateProduct(
  id: string,
  input: Partial<CreateProductInput>,
): Promise<Product> {
  return pb.collection(PRODUCTS_COLLECTION).update(id, buildPayload(input))
}

export async function deleteProduct(id: string): Promise<void> {
  await pb.collection(PRODUCTS_COLLECTION).delete(id)
}

/** Validações do kit: 2+ componentes e o kit não pode incluir a si mesmo. */
export function validateKit(
  productType: ProductType | undefined,
  components: string[] | undefined,
  selfId?: string,
): string | null {
  if (productType !== 'kit') return null
  const ids = (components || []).filter((id) => id && id !== selfId)
  if (ids.length < 2) {
    return 'Um kit precisa de pelo menos 2 produtos componentes.'
  }
  return null
}

/**
 * Estoque disponível de um produto:
 * - kit = mínimo entre (estoque do componente ÷ unidades do componente no kit);
 *   sem `components` definidos, o kit é tratado como sempre disponível.
 * - individual = a própria `quantity`.
 *
 * `productsIndex` (id → Product) é opcional: quando fornecido evita recarregar
 * os componentes. Sem índice, devolve a `quantity` própria (usado onde não há
 * a lista completa em mãos).
 */
export function availableStock(product: Product, productsIndex?: Record<string, Product>): number {
  if (product.product_type !== 'kit') return Number(product.quantity) || 0

  const ids = (product.components || []).filter(
    (id, i, arr) => id && id !== product.id && arr.indexOf(id) === i,
  )
  if (ids.length === 0 || !productsIndex) {
    return productsIndex ? 0 : Number(product.quantity) || 0
  }

  // Conta repetições do mesmo componente (kit com 2x o mesmo produto)
  const needed: Record<string, number> = {}
  for (const id of ids) needed[id] = (needed[id] || 0) + 1

  let min: number | null = null
  for (const id in needed) {
    const comp = productsIndex[id]
    if (!comp) continue // componente removido: ignora no cálculo
    const available = Math.floor((Number(comp.quantity) || 0) / needed[id])
    if (min === null || available < min) min = available
  }
  return min === null ? Number.POSITIVE_INFINITY : Math.max(min, 0)
}
