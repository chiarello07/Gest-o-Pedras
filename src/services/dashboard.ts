import pb from '@/lib/pocketbase/client'
import type { Product, Movement, Sale, UserProfile } from '@/types/database'

const HOME_LIMIT = 120

export interface DashboardData {
  products: Product[]
  movements: Movement[]
  sales: Sale[]
}

/** Carrega produtos, movimentações e vendas de uma vez para o dashboard. */
export async function getDashboardData(): Promise<DashboardData> {
  const [products, movements, sales] = await Promise.all([
    pb.collection('products').getFullList<Product>({ sort: '-created' }),
    pb.collection('movements').getFullList<Movement>({ sort: '-date' }),
    pb.collection('sales').getFullList<Sale>({ sort: '-date' }),
  ])
  return { products, movements, sales }
}

/** Lista paginada usada nas telas de listagem (home usa getDashboardData). */
export async function getSales(options?: {
  filter?: string
  sort?: string
  limit?: number
}): Promise<Sale[]> {
  return pb
    .collection('sales')
    .getList<Sale>(1, options?.limit || HOME_LIMIT, {
      filter: options?.filter,
      sort: options?.sort || '-date',
    })
    .then((res) => res.items)
}

/** Usuários autenticados com perfil (admin/gestor) — usado no seletor de perfil. */
export async function getUsers(): Promise<UserProfile[]> {
  return pb.collection('users').getFullList<UserProfile>({ sort: 'created' })
}
