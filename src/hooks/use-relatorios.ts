import { useEffect, useMemo, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { getProducts } from '@/services/products'
import type { Product, Sale, SaleItem, Movement } from '@/types/database'
import {
  buildSaleLines,
  aggregateProducts,
  aggregateChannels,
  type SaleLine,
  type ProductAgg,
  type ChannelAgg,
  type SaleItemRef,
} from '@/services/relatorios'

export interface PeriodRange {
  start: Date
  end: Date
  /** Período imediatamente anterior, de mesma duração (comparativo) */
  prev: { start: Date; end: Date }
  label: string
}

export const periodOptions = [
  'hoje',
  'ontem',
  'ultimos7',
  'ultimos30',
  'este_mes',
  'mes_passado',
  'personalizado',
] as const
export type PeriodOption = (typeof periodOptions)[number]

export const periodOptionLabels: Record<PeriodOption, string> = {
  hoje: 'Hoje',
  ontem: 'Ontem',
  ultimos7: 'Últimos 7 dias',
  ultimos30: 'Últimos 30 dias',
  este_mes: 'Este mês',
  mes_passado: 'Mês passado',
  personalizado: 'Período personalizado',
}

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}
function endOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}
function addDays(d: Date, days: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + days)
  return x
}

/** Calcula o intervalo do período (e o anterior de mesma duração). */
export function resolvePeriod(
  period: PeriodOption,
  customStart?: string,
  customEnd?: string,
): PeriodRange {
  const now = new Date()
  const labelOf = (s: Date, e: Date) =>
    s.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) ===
    e.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      ? s.toLocaleDateString('pt-BR')
      : `${s.toLocaleDateString('pt-BR')} – ${e.toLocaleDateString('pt-BR')}`

  let start: Date
  let end: Date
  let label: string

  switch (period) {
    case 'hoje':
      start = startOfDay(now)
      end = endOfDay(now)
      label = 'Hoje'
      break
    case 'ontem': {
      const y = addDays(now, -1)
      start = startOfDay(y)
      end = endOfDay(y)
      label = 'Ontem'
      break
    }
    case 'ultimos7':
      start = startOfDay(addDays(now, -6))
      end = endOfDay(now)
      label = 'Últimos 7 dias'
      break
    case 'ultimos30':
      start = startOfDay(addDays(now, -29))
      end = endOfDay(now)
      label = 'Últimos 30 dias'
      break
    case 'este_mes':
      start = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1))
      end = endOfDay(now)
      label = `Este mês (${start.toLocaleDateString('pt-BR', { month: 'long' })})`
      break
    case 'mes_passado': {
      start = startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1))
      end = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0))
      label = `Mês passado (${start.toLocaleDateString('pt-BR', { month: 'long' })})`
      break
    }
    case 'personalizado': {
      const s = customStart ? startOfDay(new Date(`${customStart}T00:00:00`)) : startOfDay(now)
      const e = customEnd ? endOfDay(new Date(`${customEnd}T00:00:00`)) : endOfDay(now)
      start = s
      end = e
      label = labelOf(s, e)
      break
    }
  }

  const durMs = end.getTime() - start.getTime()
  const prevEnd = new Date(start.getTime() - 1) // 1 ms antes do início
  const prevStart = new Date(prevEnd.getTime() - durMs)
  return { start, end, prev: { start: prevStart, end: prevEnd }, label }
}

const inRange = (dateStr: string, r: { start: Date; end: Date }): boolean => {
  const d = new Date(dateStr)
  return !isNaN(d.getTime()) && d >= r.start && d <= r.end
}

export interface RelatoriosData {
  loading: boolean
  sales: Sale[]
  saleLines: SaleLine[]
  prevSaleLines: SaleLine[]
  productRanking: ProductAgg[]
  channels: ChannelAgg[]
  prevChannels: ChannelAgg[]
  products: Product[]
  movements: Movement[]
  prevMovements: Movement[]
  /** Entradas × saídas por dia (curva de caixa) — inclui vendas concluídas como entrada, padrão Dashboard/Financeiro */
  cashCurve: { date: string; entradas: number; saidas: number; saldo: number }[]
  totals: {
    totalVendido: number
    custoVendido: number
    lucroLiquido: number
    ticketMedio: number
    countVendas: number
    entradas: number
    saidas: number
    saldo: number
    prevTotalVendido: number
    prevLucroLiquido: number
    prevEntradas: number
    prevSaidas: number
    prevSaldo: number
  }
}

export function useRelatoriosData(period: PeriodRange): RelatoriosData {
  const [sales, setSales] = useState<Sale[]>([])
  const [items, setItems] = useState<SaleItem[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [movements, setMovements] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      pb.collection('sales').getFullList<Sale>({ sort: '-date' }),
      pb.collection('sale_items').getFullList<SaleItem>({ sort: '-created' }),
      getProducts(),
      pb.collection('movements').getFullList<Movement>({ sort: '-date' }),
    ])
      .then(([s, it, p, m]) => {
        if (cancelled) return
        setSales(s)
        setItems(it)
        setProducts(p)
        setMovements(m)
      })
      .catch(() => {
        if (!cancelled) {
          setSales([])
          setItems([])
          setProducts([])
          setMovements([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }

  useEffect(() => load(), [])

  useRealtime('sales', load)
  useRealtime('sale_items', load)
  useRealtime('products', load)
  useRealtime('movements', load)

  const itemsBySale = useMemo(() => {
    const map: Record<string, SaleItemRef[]> = {}
    for (const it of items) {
      if (!it.sale) continue
      const name = it.expand?.product?.name || 'Produto removido'
      ;(map[it.sale] ||= []).push({
        product: it.product,
        name,
        quantity: Number(it.quantity) || 0,
        subtotal: Number(it.subtotal) || 0,
      })
    }
    return map
  }, [items])

  const periodSales = useMemo(() => sales.filter((s) => inRange(s.date, period)), [sales, period])
  const prevSales = useMemo(
    () => sales.filter((s) => inRange(s.date, period.prev)),
    [sales, period],
  )

  const saleLines = useMemo(
    () => buildSaleLines(periodSales, itemsBySale, products),
    [periodSales, itemsBySale, products],
  )
  const prevSaleLines = useMemo(
    () => buildSaleLines(prevSales, itemsBySale, products),
    [prevSales, itemsBySale, products],
  )

  const productRanking = useMemo(
    () => aggregateProducts(periodSales, itemsBySale, products),
    [periodSales, itemsBySale, products],
  )

  const channels = useMemo(() => aggregateChannels(saleLines), [saleLines])
  const prevChannels = useMemo(() => aggregateChannels(prevSaleLines), [prevSaleLines])

  const periodMovements = useMemo(
    () => movements.filter((m) => inRange(m.date, period)),
    [movements, period],
  )
  const prevMovements = useMemo(
    () => movements.filter((m) => inRange(m.date, period.prev)),
    [movements, period],
  )

  /** Critério do Dashboard/Financeiro: vendas concluídas contam como entrada de caixa. */
  const cashEntries = (movs: Movement[], lines: SaleLine[]) => {
    let entradas = 0
    let saidas = 0
    for (const m of movs) {
      if (m.type === 'entrada') entradas += Number(m.amount) || 0
      else saidas += Number(m.amount) || 0
    }
    for (const l of lines) entradas += l.total
    return { entradas, saidas, saldo: entradas - saidas }
  }

  const totals = useMemo(() => {
    const totalVendido = saleLines.reduce((acc, l) => acc + l.total, 0)
    const custoVendido = saleLines.reduce((acc, l) => acc + l.cost, 0)
    const cur = cashEntries(periodMovements, saleLines)
    const prev = cashEntries(prevMovements, prevSaleLines)
    return {
      totalVendido,
      custoVendido,
      lucroLiquido: totalVendido - custoVendido,
      ticketMedio: saleLines.length > 0 ? totalVendido / saleLines.length : 0,
      countVendas: saleLines.length,
      ...cur,
      prevTotalVendido: prevSaleLines.reduce((acc, l) => acc + l.total, 0),
      prevLucroLiquido:
        prevSaleLines.reduce((acc, l) => acc + l.total, 0) -
        prevSaleLines.reduce((acc, l) => acc + l.cost, 0),
      ...prev,
      prevEntradas: prev.entradas,
      prevSaidas: prev.saidas,
      prevSaldo: prev.saldo,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saleLines, prevSaleLines, periodMovements, prevMovements])

  const cashCurve = useMemo(() => {
    const byDay = new Map<string, { entradas: number; saidas: number }>()
    const keyOf = (d: string) =>
      new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    const bump = (k: string, field: 'entradas' | 'saidas', v: number) => {
      const cur = byDay.get(k) || { entradas: 0, saidas: 0 }
      cur[field] += v
      byDay.set(k, cur)
    }
    for (const m of periodMovements) {
      bump(keyOf(m.date), m.type === 'entrada' ? 'entradas' : 'saidas', Number(m.amount) || 0)
    }
    for (const l of saleLines) bump(keyOf(l.date), 'entradas', l.total)
    const days = Array.from(byDay.entries())
      .sort((a, b) =>
        a[0].split('/').reverse().join('-').localeCompare(b[0].split('/').reverse().join('-')),
      )
      .map(([date, v]) => ({ date, ...v, saldo: v.entradas - v.saidas }))
    let acc = 0
    return days.map((d) => {
      acc += d.saldo
      return { ...d, saldo: acc }
    })
  }, [periodMovements, saleLines])

  return {
    loading,
    sales: periodSales,
    saleLines,
    prevSaleLines,
    productRanking,
    channels,
    prevChannels,
    products,
    movements: periodMovements,
    prevMovements,
    cashCurve,
    totals,
  }
}
