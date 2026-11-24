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

/** Converte a data para o formato aceito pelo PocketBase (ISO 8601 / RFC 3339 UTC). */
function toPbDate(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toISOString()
}

/**
 * Registra uma venda multi-itens. O backend (pb_hook) valida estoque,
 * cria os sale_items e decrementa a quantidade dos produtos.
 *
 * O campo `items` (json) é enviado como ARRAY NATIVO — nunca JSON.stringify:
 * o SDK serializa sozinho e uma string dupla-serializada quebra o pb_hook.
 * O `total` vai preenchido porque o campo é required (o hook recalcula
 * depois, a partir dos itens validados).
 */
export async function createSale(input: CreateSaleInput): Promise<Sale> {
  const items = (input.items || []).map((i) => ({
    product: i.product,
    quantity: i.quantity,
    unit_price: i.unit_price,
  }))
  return pb.collection('sales').create<Sale>({
    channel: input.channel,
    date: toPbDate(input.date),
    customer: input.customer || '',
    status: input.status || 'concluida',
    total: items.reduce(
      (acc, i) => acc + (Number(i.unit_price) || 0) * (Number(i.quantity) || 0),
      0,
    ),
    items,
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
