import type { Product, Sale, SaleChannel } from '@/types/database'

/** Venda normalizada: une vendas legadas (product/quantity) e multi-itens (sale_items). */
export interface SaleLine {
  id: string
  date: string
  channel: SaleChannel
  customer: string
  /** Rótulo legível dos produtos da venda */
  productsLabel: string
  /** Quantidade total de itens da venda */
  totalQty: number
  total: number
  /** Custo dos produtos vendidos (para o lucro líquido) */
  cost: number
  /** Lucro da venda = total − custo */
  profit: number
}

export interface ProductAgg {
  productId: string
  name: string
  qty: number
  revenue: number
  cost: number
  profit: number
}

export interface ChannelAgg {
  channel: SaleChannel
  total: number
  qty: number
  count: number
}

const CHANNEL_LABELS: Record<SaleChannel, string> = {
  instagram: 'Instagram',
  whatsapp: 'WhatsApp',
  loja_online: 'Loja Online',
  fisico: 'Loja Físico',
}

export function channelLabel(c: SaleChannel): string {
  return CHANNEL_LABELS[c] || c
}

export interface SaleItemRef {
  product: string
  name: string
  quantity: number
  subtotal?: number
}

export function buildSaleLines(
  sales: Sale[],
  itemsBySale: Record<string, SaleItemRef[]>,
  products: Product[],
): SaleLine[] {
  const productById = new Map(products.map((p) => [p.id, p]))
  return sales.map((s) => {
    const total = Number(s.total) || 0
    let productsLabel = ''
    let totalQty = 0
    let cost = 0

    if (s.product) {
      // Venda legada de item único (fallback: product/quantity)
      const p = productById.get(s.product)
      const qty = Number(s.quantity) || 1
      productsLabel = p?.name || 'Produto removido'
      totalQty = qty
      cost = (Number(p?.cost) || 0) * qty
    } else {
      const items = itemsBySale[s.id] || []
      productsLabel =
        items.length > 0
          ? items.map((i) => `${i.name} ×${i.quantity}`).join(', ')
          : 'Sem itens registrados'
      totalQty = items.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0)
      cost = items.reduce((acc, i) => {
        const p = productById.get(i.product)
        return acc + (Number(p?.cost) || 0) * (Number(i.quantity) || 0)
      }, 0)
    }

    return {
      id: s.id,
      date: s.date,
      channel: s.channel,
      customer: s.customer || '—',
      productsLabel,
      totalQty,
      total,
      cost,
      profit: total - cost,
    }
  })
}

/** Ranking de produtos por quantidade ou lucro, a partir das linhas de venda. */
export function aggregateProducts(
  sales: Sale[],
  itemsBySale: Record<string, SaleItemRef[]>,
  products: Product[],
): ProductAgg[] {
  const map = new Map<string, ProductAgg>()
  const ensure = (id: string, name: string): ProductAgg => {
    let agg = map.get(id)
    if (!agg) {
      agg = { productId: id, name, qty: 0, revenue: 0, cost: 0, profit: 0 }
      map.set(id, agg)
    }
    return agg
  }

  for (const s of sales) {
    const total = Number(s.total) || 0
    if (s.product) {
      const p = products.find((pr) => pr.id === s.product)
      const qty = Number(s.quantity) || 1
      const cost = (Number(p?.cost) || 0) * qty
      const agg = ensure(s.product, p?.name || 'Produto removido')
      agg.qty += qty
      agg.revenue += total
      agg.cost += cost
      agg.profit += total - cost
    } else {
      const items = itemsBySale[s.id] || []
      // Receita multi-itens: rateia o total da venda entre os itens pelo subtotal
      const subtotalSum = items.reduce((acc, i) => acc + (i.subtotal || 0), 0)
      for (const i of items) {
        const p = products.find((pr) => pr.id === i.product)
        const qty = Number(i.quantity) || 0
        const cost = (Number(p?.cost) || 0) * qty
        const revenue =
          subtotalSum > 0
            ? total * ((i.subtotal || 0) / subtotalSum)
            : total / Math.max(items.length, 1)
        const agg = ensure(i.product, i.name || p?.name || 'Produto removido')
        agg.qty += qty
        agg.revenue += revenue
        agg.cost += cost
      }
    }
  }

  for (const agg of map.values()) agg.profit = agg.revenue - agg.cost
  return Array.from(map.values())
}

export function aggregateChannels(saleLines: SaleLine[]): ChannelAgg[] {
  const map = new Map<SaleChannel, ChannelAgg>()
  for (const l of saleLines) {
    let agg = map.get(l.channel)
    if (!agg) {
      agg = { channel: l.channel, total: 0, qty: 0, count: 0 }
      map.set(l.channel, agg)
    }
    agg.total += l.total
    agg.qty += l.totalQty
    agg.count += 1
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total)
}
