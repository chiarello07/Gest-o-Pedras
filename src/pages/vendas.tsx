import { useEffect, useMemo, useState } from 'react'
import {
  ShoppingBag,
  Plus,
  TrendingUp,
  CalendarDays,
  Receipt,
  CircleDollarSign,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AnimatedCounter, formatCurrency } from '@/components/AnimatedCounter'
import NewSaleModal from '@/components/NewSaleModal'
import { KitBadge } from '@/components/KitBadge'
import { useRealtime } from '@/hooks/use-realtime'
import { getSales, getSaleItems } from '@/services/sales'
import { channelLabels } from '@/lib/labels'
import type { Sale, SaleChannel, SaleStatus } from '@/types/database'
import pb from '@/lib/pocketbase/client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

type PeriodFilter = 'todos' | 'hoje' | '7d' | '30d'

const periodLabels: Record<PeriodFilter, string> = {
  todos: 'Todo o período',
  hoje: 'Hoje',
  '7d': 'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
}

const statusStyles: Record<
  SaleStatus,
  { bg: string; text: string; border: string; label: string }
> = {
  concluida: { bg: '#EFF3F0', text: '#3E7C4F', border: '#CFE0D4', label: 'Concluída' },
  pendente: { bg: '#FAF3E0', text: '#A8861D', border: '#EAD9A8', label: 'Pendente' },
  cancelada: { bg: '#F7EBEA', text: '#B3452F', border: '#EBBBB3', label: 'Cancelada' },
}

const channelOrder: SaleChannel[] = ['instagram', 'whatsapp', 'loja_online', 'fisico']

function withinPeriod(saleDate: string, period: PeriodFilter): boolean {
  if (period === 'todos') return true
  const d = new Date(saleDate)
  if (isNaN(d.getTime())) return false

  const now = new Date()
  if (period === 'hoje') {
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    )
  }
  const days = period === '7d' ? 7 : 30
  const cutoff = new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000)
  cutoff.setHours(0, 0, 0, 0)
  return d >= cutoff
}

const numberFmt = new Intl.NumberFormat('pt-BR')

export default function Vendas() {
  const [sales, setSales] = useState<Sale[]>([])
  const [itemsCount, setItemsCount] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [channelFilter, setChannelFilter] = useState<'todos' | SaleChannel>('todos')
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('todos')
  const [modalOpen, setModalOpen] = useState(false)
  const [detailSale, setDetailSale] = useState<Sale | null>(null)
  const [detailItems, setDetailItems] = useState<
    {
      id: string
      name: string
      quantity: number
      unitPrice: number
      subtotal: number
      isKit: boolean
    }[]
  >([])
  const [detailLoading, setDetailLoading] = useState(false)

  const loadSales = () => {
    getSales()
      .then((list) => {
        setSales(list)
        const counts: Record<string, number> = {}
        list.forEach((s) => {
          counts[s.id] = s.product ? Number(s.quantity) || 1 : 0
        })
        setItemsCount(counts)
      })
      .catch(() => setSales([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadSales()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useRealtime('sales', loadSales)
  useRealtime('sale_items', loadSales)
  useRealtime('products', loadSales)

  // Conta os itens reais por venda (uma consulta por venda, em lote)
  useEffect(() => {
    if (sales.length === 0) return
    let cancelled = false
    Promise.all(
      sales
        .filter((s) => !s.product)
        .map(async (s) => {
          try {
            const items = await getSaleItems(s.id)
            return {
              saleId: s.id,
              count: items.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0),
            }
          } catch (_) {
            return null
          }
        }),
    ).then((results) => {
      if (cancelled) return
      const counts: Record<string, number> = { ...itemsCount }
      results.forEach((r) => {
        if (r) counts[r.saleId] = r.count
      })
      setItemsCount(counts)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sales])

  const filtered = useMemo(() => {
    return sales
      .filter((s) => channelFilter === 'todos' || s.channel === channelFilter)
      .filter((s) => withinPeriod(s.date, periodFilter))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [sales, channelFilter, periodFilter])

  const kpis = useMemo(() => {
    const totalFaturado = filtered.reduce((acc, s) => acc + (Number(s.total) || 0), 0)
    const totalItens = filtered.reduce((acc, s) => acc + (itemsCount[s.id] ?? 0), 0)
    const ticketMedio = filtered.length > 0 ? totalFaturado / filtered.length : 0
    return { totalFaturado, totalItens, ticketMedio, count: filtered.length }
  }, [filtered, itemsCount])

  const openDetail = async (sale: Sale) => {
    setDetailSale(sale)
    setDetailItems([])
    setDetailLoading(true)
    try {
      if (sale.product) {
        // Venda legada de item único
        const rec = await pb.collection('products').getOne(sale.product)
        setDetailItems([
          {
            id: rec.id,
            name: rec.name,
            quantity: Number(sale.quantity) || 1,
            unitPrice: (Number(sale.total) || 0) / (Number(sale.quantity) || 1),
            subtotal: Number(sale.total) || 0,
            isKit: rec.product_type === 'kit',
          },
        ])
      } else {
        const items = await getSaleItems(sale.id)
        setDetailItems(
          items.map((i) => ({
            id: i.id,
            name: i.expand?.product?.name || 'Produto removido',
            quantity: Number(i.quantity) || 0,
            unitPrice: Number(i.unit_price) || 0,
            subtotal: Number(i.subtotal) || 0,
            isKit: i.expand?.product?.product_type === 'kit',
          })),
        )
      }
    } catch (_) {
      setDetailItems([])
    } finally {
      setDetailLoading(false)
    }
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  return (
    <div className="space-y-6 animate-crystalline pb-12">
      {/* Mini-KPI cards no topo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="gem-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#6B7A70] uppercase tracking-wider">
              Vendas (filtro)
            </p>
            <p className="font-serif text-2xl font-bold text-[#1E3A2F] mt-1">
              <AnimatedCounter value={kpis.count} decimals={0} />
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-[#EFF3F0] text-[#3E7C4F] flex items-center justify-center">
            <ShoppingBag className="h-5 w-5" />
          </div>
        </div>

        <div className="gem-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#6B7A70] uppercase tracking-wider">
              Total Faturado
            </p>
            <p className="font-serif text-2xl font-bold text-[#1E3A2F] mt-1">
              <AnimatedCounter value={kpis.totalFaturado} prefix="R$ " />
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-[#FAF3E0] text-[#C9A227] flex items-center justify-center">
            <CircleDollarSign className="h-5 w-5" />
          </div>
        </div>

        <div className="gem-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#6B7A70] uppercase tracking-wider">
              Itens Vendidos
            </p>
            <p className="font-serif text-2xl font-bold text-[#1E3A2F] mt-1">
              <AnimatedCounter value={kpis.totalItens} decimals={0} />
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-[#EFF3F0] text-[#3E7C4F] flex items-center justify-center">
            <Receipt className="h-5 w-5" />
          </div>
        </div>

        <div className="gem-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#6B7A70] uppercase tracking-wider">
              Ticket Médio
            </p>
            <p className="font-serif text-2xl font-bold text-[#1E3A2F] mt-1">
              <AnimatedCounter value={kpis.ticketMedio} prefix="R$ " />
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-[#FAF3E0] text-[#C9A227] flex items-center justify-center">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Barra de Filtros, Busca e Ações */}
      <div className="gem-card p-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filtro por Canal */}
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value as 'todos' | SaleChannel)}
              className="h-10 rounded-lg border border-[#E8E4DA] bg-white px-3 text-xs sm:text-sm text-[#1F2A24] focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
            >
              <option value="todos">Todos os Canais</option>
              {channelOrder.map((c) => (
                <option key={c} value={c}>
                  {channelLabels[c]}
                </option>
              ))}
            </select>

            {/* Filtro por Período */}
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)}
              className="h-10 rounded-lg border border-[#E8E4DA] bg-white px-3 text-xs sm:text-sm text-[#1F2A24] focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
            >
              {(Object.keys(periodLabels) as PeriodFilter[]).map((p) => (
                <option key={p} value={p}>
                  {periodLabels[p]}
                </option>
              ))}
            </select>

            {(channelFilter !== 'todos' || periodFilter !== 'todos') && (
              <button
                onClick={() => {
                  setChannelFilter('todos')
                  setPeriodFilter('todos')
                }}
                className="text-[#C9A227] hover:underline font-medium text-xs"
              >
                Limpar filtros
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {/* Botão Nova Venda */}
            <Button
              onClick={() => setModalOpen(true)}
              className="bg-[#C9A227] hover:bg-[#A8861D] text-white font-semibold text-xs sm:text-sm h-10 px-4 flex items-center gap-1.5 shadow"
            >
              <Plus className="h-4 w-4" />
              <span>Nova Venda</span>
            </Button>
          </div>
        </div>

        {/* Resumo do filtro */}
        <div className="flex items-center justify-between text-xs text-[#6B7A70] pt-3 mt-3 border-t border-[#E8E4DA]/60">
          <span>
            Mostrando <strong>{filtered.length}</strong> de <strong>{sales.length}</strong> vendas
          </span>
          <span className="hidden sm:flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 text-[#C9A227]" />
            {periodLabels[periodFilter]}
          </span>
        </div>
      </div>

      {/* Tabela de vendas */}
      {loading ? (
        <div className="flex h-48 items-center justify-center rounded-2xl border border-[#E8E4DA] bg-white">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#C9A227] border-t-transparent" />
            <p className="text-xs text-[#6B7A70]">Carregando vendas...</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="gem-card p-12 text-center">
          <Search className="h-10 w-10 text-[#C9A227] mx-auto opacity-50 mb-2" />
          <h4 className="font-serif text-lg font-bold text-[#1E3A2F]">Nenhuma venda encontrada</h4>
          <p className="text-xs text-[#6B7A70] mt-1 mb-4">
            Ajuste os filtros ou registre a primeira venda do período.
          </p>
          <Button
            onClick={() => setModalOpen(true)}
            className="bg-[#C9A227] hover:bg-[#A8861D] text-white font-semibold text-xs sm:text-sm h-10 px-4"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Nova Venda
          </Button>
        </div>
      ) : (
        <div className="gem-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[#FAF8F3] border-b border-[#E8E4DA] text-[#6B7A70] uppercase font-semibold text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-3">Cliente</th>
                  <th className="py-3 px-3">Canal</th>
                  <th className="py-3 px-3 text-right">Itens</th>
                  <th className="py-3 px-3 text-right">Valor Total</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E4DA]">
                {filtered.map((sale) => {
                  const st = statusStyles[sale.status || 'concluida']
                  const channelLabel = channelLabels[sale.channel] || sale.channel
                  return (
                    <tr
                      key={sale.id}
                      onClick={() => openDetail(sale)}
                      className="hover:bg-[#FAF8F3] transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 font-medium text-[#1E3A2F] whitespace-nowrap">
                        {formatDate(sale.date)}
                      </td>
                      <td className="py-3.5 px-3 text-[#1F2A24] max-w-[180px] truncate">
                        {sale.customer || <span className="text-[#8EA598]">—</span>}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border inline-block bg-[#FAF3E0] text-[#A8861D] border-[#EAD9A8]">
                          {channelLabel}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right font-medium text-[#1E3A2F] tabular-nums">
                        {itemsCount[sale.id] ?? '…'}
                      </td>
                      <td className="py-3.5 px-3 text-right font-bold text-[#1E3A2F] font-mono tabular-nums">
                        {formatCurrency(Number(sale.total) || 0)}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span
                          style={{ backgroundColor: st.bg, color: st.text, borderColor: st.border }}
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold border inline-block"
                        >
                          {st.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            openDetail(sale)
                          }}
                          className="text-[#C9A227] hover:underline font-medium"
                        >
                          Ver itens
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Resumo em números por canal */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {channelOrder.map((c) => {
          const channelSales = filtered.filter((s) => s.channel === c)
          const channelTotal = channelSales.reduce((acc, s) => acc + (Number(s.total) || 0), 0)
          return (
            <div key={c} className="gem-card p-4">
              <p className="text-[11px] font-semibold text-[#6B7A70] uppercase tracking-wider">
                {channelLabels[c]}
              </p>
              <p className="font-serif text-lg font-bold text-[#1E3A2F] mt-0.5 tabular-nums">
                {formatCurrency(channelTotal)}
              </p>
              <p className="text-[11px] text-[#8EA598]">
                {numberFmt.format(channelSales.length)}{' '}
                {channelSales.length === 1 ? 'venda' : 'vendas'}
              </p>
            </div>
          )
        })}
      </div>

      {/* Modal: Nova Venda */}
      <NewSaleModal open={modalOpen} onOpenChange={setModalOpen} onSuccess={loadSales} />

      {/* Modal: Detalhes da venda */}
      <Dialog open={Boolean(detailSale)} onOpenChange={(o) => !o && setDetailSale(null)}>
        <DialogContent className="max-w-[520px] max-h-[92vh] overflow-y-auto bg-white border-[#E8E4DA] p-6 sm:p-7 rounded-2xl">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FAF3E0] text-[#C9A227]">
                <Receipt className="h-4 w-4" />
              </span>
              <DialogTitle className="font-serif text-2xl text-[#1E3A2F]">
                Detalhes da Venda
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-[#6B7A70]">
              {detailSale &&
                `${formatDate(detailSale.date)} · ${channelLabels[detailSale.channel] || detailSale.channel}`}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#6B7A70] font-semibold uppercase tracking-wider">Cliente</span>
              <span className="text-[#1F2A24] font-medium">{detailSale?.customer || '—'}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#6B7A70] font-semibold uppercase tracking-wider">Status</span>
              <span className="text-[#1F2A24] font-medium">
                {statusStyles[detailSale?.status || 'concluida'].label}
              </span>
            </div>

            <div className="rounded-xl border border-[#E8E4DA] overflow-hidden">
              <div className="bg-[#FAF8F3] px-4 py-2.5 border-b border-[#E8E4DA]">
                <p className="text-[11px] font-semibold text-[#6B7A70] uppercase tracking-wider">
                  Itens do Pedido
                </p>
              </div>
              {detailLoading ? (
                <div className="p-5 text-center text-xs text-[#6B7A70]">Carregando itens...</div>
              ) : detailItems.length === 0 ? (
                <div className="p-5 text-center text-xs text-[#6B7A70]">
                  Nenhum item vinculado a esta venda.
                </div>
              ) : (
                <div className="divide-y divide-[#E8E4DA]/70">
                  {detailItems.map((i) => (
                    <div key={i.id} className="p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p className="font-serif text-sm font-bold text-[#1E3A2F] truncate">
                            {i.name}
                          </p>
                          {i.isKit && <KitBadge />}
                        </div>
                        <p className="text-[11px] text-[#6B7A70]">
                          {i.quantity} × {formatCurrency(i.unitPrice)}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-[#1E3A2F] font-mono tabular-nums">
                        {formatCurrency(i.subtotal)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              <div className="bg-[#FAF8F3] px-4 py-3 border-t border-[#E8E4DA] flex items-center justify-between">
                <span className="text-xs font-semibold text-[#6B7A70] uppercase tracking-wider">
                  Total
                </span>
                <span className="font-serif text-lg font-bold text-[#C9A227] tabular-nums">
                  {formatCurrency(Number(detailSale?.total) || 0)}
                </span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
