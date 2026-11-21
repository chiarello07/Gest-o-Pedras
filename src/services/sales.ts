import pb from '@/lib/pocketbase/client'
import type { Sale, SaleChannel, SaleStatus } from '@/types/database'

export interface SaleItemInput {
  product: string
  quantity: number
  unit_price: number
}

export interface CreateSaleInput {
  channel: SaleChannel
  date: string
  customer?: string
  status?: SaleStatus
  items: SaleItemInput[]
}

/** Lista todas as vendas (mais recentes primeiro). */
export async function getSales(options?: { filter?: string; sort?: string }): Promise<Sale[]> {
  return pb.collection('sales').getFullList<Sale>({
    filter: options?.filter,
    sort: options?.sort || '-date',
  })
}

/**
 * Registra uma venda multi-itens. O backend (pb_hook) valida estoque,
 * cria os sale_items e decrementa a quantidade dos produtos.
 */
export async function createSale(input: CreateSaleInput): Promise<Sale> {
  return pb.collection('sales').create<Sale>({
    channel: input.channel,
    date: input.date,
    customer: input.customer || '',
    status: input.status || 'concluida',
    items: JSON.stringify(input.items),
  })
}

/** Itens de uma venda (com o produto expandido). */
export async function getSaleItems(saleId: string) {
  return pb.collection('sale_items').getFullList({
    filter: `sale = "${saleId}"`,
    sort: 'created',
    expand: 'product',
  })
}
