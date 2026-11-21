import { useEffect, useMemo, useState } from 'react'
import {
  CircleDollarSign,
  TrendingUp,
  Package,
  Plus,
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  CalendarDays,
  Search,
  PieChart,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AnimatedCounter, formatCurrency } from '@/components/AnimatedCounter'
import NewMovementModal from '@/components/NewMovementModal'
import ResultsSplitSection from '@/components/ResultsSplitSection'
import { useRealtime } from '@/hooks/use-realtime'
import { useAuth } from '@/context/AuthContext'
import pb from '@/lib/pocketbase/client'
import { getMovements } from '@/services/movements'
import { getSales } from '@/services/sales'
import { getProducts } from '@/services/products'
import { movementCategoryLabels } from '@/types/database'
import type { Movement, MovementCategory, Product, Sale } from '@/types/database'

type PeriodFilter = 'hoje' | '7d' | '30d' | 'este_mes' | 'mes_passado'
type TypeFilter = 'todos' | 'entrada' | 'saida'

const periodLabels: Record<PeriodFilter, string> = {
  hoje: 'Hoje',
  '7d': 'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
  este_mes: 'Este mês',
  mes_passado: 'Mês passado',
}

const typeFilterLabels: Record<TypeFilter, string> = {
  todos: 'Todos os tipos',
  entrada: 'Entradas',
  saida: 'Saídas',
}

/** Início (00:00 local) do período selecionado. */
function periodStart(period: PeriodFilter): Date | null {
  const now = new Date()
  const start = new Date()
  start.setHours(0, 0, 0, 0)

  switch (period) {
    case 'hoje':
      return start
    case '7d': {
      const d = new Date(start)
      d.setDate(d.getDate() - 6)
      return d
    }
    case '30d': {
      const d = new Date(start)
      d.setDate(d.getDate() - 29)
      return d
    }
    case 'este_mes':
      return new Date(now.getFullYear(), now.getMonth(), 1)
    case 'mes_passado':
      return new Date(now.getFullYear(), now.getMonth() - 1, 1)
    default:
      return null
  }
}

function periodEnd(period: PeriodFilter): Date | null {
  if (period !== 'mes_passado') return null
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1) // exclusivo
}

function withinPeriod(dateStr: string, period: PeriodFilter): boolean {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return false
  const start = periodStart(period)
  if (start && d < start) return false
  const end = periodEnd(period)
  if (end && d >= end) return false
  return true
}

export default function Financeiro() {
  const { role } = useAuth()
  const isAdmin = role === 'admin'
  const [movements, setMovements] = useState<Movement[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('este_mes')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('todos')
  const [modalOpen, setModalOpen] = useState(false)

  const loadData = () => {
    Promise.all([getMovements(), getSales(), getProducts({ sort: 'name' })])
      .then(([m, s, p]) => {
        setMovements(m)
        setSales(s)
        setProducts(p)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useRealtime('movements', loadData)
  useRealtime('sales', loadData)
  useRealtime('products', loadData)
  useRealtime('sale_items', loadData)

  // Movimentações do período (independente do filtro de tipo) — base dos cards
  const periodMovements = useMemo(
    () => movements.filter((m) => withinPeriod(m.date, periodFilter)),
    [movements, periodFilter],
  )

  // Lista filtrada da tabela (período + tipo)
  const filteredMovements = useMemo(
    () =>
      periodMovements
        .filter((m) => typeFilter === 'todos' || m.type === typeFilter)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [periodMovements, typeFilter],
  )

  // Vendas e produtos não têm "período" nos cards onde não faz sentido;
  // vendas respeitam o período selecionado.
  const periodSales = useMemo(
    () =>
      sales.filter(
        (s) => (s.status || 'concluida') !== 'cancelada' && withinPeriod(s.date, periodFilter),
      ),
    [sales, periodFilter],
  )

  const kpis = useMemo(() => {
    // Caixa atual: saldo global (todas as movimentações + todas as vendas reais)
    const allMovsTotal = movements.reduce((acc, m) => {
      if (m.type === 'entrada') return acc + (Number(m.amount) || 0)
      if (m.type === 'saida') return acc - (Number(m.amount) || 0)
      return acc
    }, 0)
    const allSalesTotal = sales.reduce(
      (acc, s) => acc + ((s.status || 'concluida') === 'cancelada' ? 0 : Number(s.total) || 0),
      0,
    )
    const caixaAtual = allMovsTotal + allSalesTotal

    // Total vendido no período
    const totalVendido = periodSales.reduce((acc, s) => acc + (Number(s.total) || 0), 0)

    // Total investido em produtos (custo do estoque atual)
    const totalInvestido = products.reduce(
      (acc, p) => acc + (Number(p.quantity) || 0) * (Number(p.cost) || 0),
      0,
    )

    // Lucro líquido estimado = total vendido (período) − custo dos produtos vendidos
    // Custo dos produtos vendidos: legado via sale.product/quantity (custo × qtd)
    // e novas vendas via sale_items (custo × qtd de cada item).
    let custoVendido = 0
    for (const s of periodSales) {
      if (s.product) {
        const p = products.find((pr) => pr.id === s.product)
        if (p) custoVendido += (Number(p.cost) || 0) * (Number(s.quantity) || 1)
        continue
      }
      // venda multi-itens: busca os itens expandidos em sale_items (via sale.expand não disponível
      // aqui, então consultamos via serviço de itens em lote abaixo)
    }
    return {
      caixaAtual,
      totalVendido,
      totalInvestido,
      custoVendido,
      lucroLiquido: totalVendido - custoVendido,
    }
  }, [movements, sales, periodSales, products])

  const [itemCosts, setItemCosts] = useState<Record<string, number>>({})
  useEffect(() => {
    if (sales.length === 0) return
    let cancelled = false
    Promise.all(
      sales
        .filter((s) => !s.product)
        .map(async (s) => {
          try {
            const items = await pb.collection('sale_items').getFullList({
              filter: `sale = "${s.id}"`,
              expand: 'product',
            })
            const cost = items.reduce(
              (acc, i) => acc + (Number(i.expand?.product?.cost) || 0) * (Number(i.quantity) || 0),
              0,
            )
            return { saleId: s.id, cost }
          } catch (_) {
            return null
          }
        }),
    ).then((results) => {
      if (cancelled) return
      const map: Record<string, number> = {}
      results.forEach((r) => {
        if (r) map[r.saleId] = r.cost
      })
      setItemCosts(map)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sales])

  const lucroLiquido =
    kpis.totalVendido -
    periodSales.reduce((acc, s) => acc + (itemCosts[s.id] ?? fallbackCost(s, products)), 0)

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  const categoryLabel = (c?: MovementCategory) => (c ? movementCategoryLabels[c] || c : '—')

  const typeBadge = (m: Movement) =>
    m.type === 'entrada'
      ? { bg: '#EFF3F0', text: '#3E7C4F', border: '#CFE0D4', label: 'Entrada', Icon: ArrowUpCircle }
      : { bg: '#F7EBEA', text: '#B3452F', border: '#EBBBB3', label: 'Saída', Icon: ArrowDownCircle }

  return (
    <div className="space-y-6 animate-crystalline pb-12">
      {/* ========================================================= */}
      {/* 1. RESUMO EM CARDS NO TOPO                                */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
        <div className="gem-card p-5 relative overflow-hidden flex flex-col justify-between gem-lift">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-[#6B7A70] uppercase tracking-wider">
                Caixa Atual
              </span>
              <div className="mt-2 text-2xl font-serif font-bold text-[#1E3A2F]">
                <AnimatedCounter value={kpis.caixaAtual} prefix="R$ " />
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EFF3F0] text-[#3E7C4F]">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-4 text-[11px] text-[#6B7A70] border-t border-[#E8E4DA]/60 pt-2.5">
            Saldo global: todas as movimentações + vendas
          </p>
        </div>

        <div className="gem-card p-5 relative overflow-hidden flex flex-col justify-between gem-lift">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-[#6B7A70] uppercase tracking-wider">
                Total Vendido no Período
              </span>
              <div className="mt-2 text-2xl font-serif font-bold text-[#1E3A2F]">
                <AnimatedCounter value={kpis.totalVendido} prefix="R$ " />
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FAF3E0] text-[#C9A227]">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-4 text-[11px] text-[#6B7A70] border-t border-[#E8E4DA]/60 pt-2.5">
            {periodSales.length}{' '}
            {periodSales.length === 1 ? 'venda registrada' : 'vendas registradas'} ·{' '}
            {periodLabels[periodFilter]}
          </p>
        </div>

        <div className="gem-card p-5 relative overflow-hidden flex flex-col justify-between gem-lift">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-[#6B7A70] uppercase tracking-wider">
                Investido em Produtos
              </span>
              <div className="mt-2 text-2xl font-serif font-bold text-[#1E3A2F]">
                <AnimatedCounter value={kpis.totalInvestido} prefix="R$ " />
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FAF3E0] text-[#C9A227]">
              <Package className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-4 text-[11px] text-[#6B7A70] border-t border-[#E8E4DA]/60 pt-2.5">
            Custo do estoque atual ({products.length} produtos)
          </p>
        </div>

        <div className="gem-card p-5 relative overflow-hidden flex flex-col justify-between gem-lift">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-[#6B7A70] uppercase tracking-wider">
                Lucro Líquido Estimado
              </span>
              <div className="mt-2 text-2xl font-serif font-bold text-[#1E3A2F]">
                <AnimatedCounter value={lucroLiquido} prefix="R$ " />
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EFF3F0] text-[#3E7C4F]">
              <CircleDollarSign className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-4 text-[11px] text-[#6B7A70] border-t border-[#E8E4DA]/65 pt-2.5">
            Total vendido − custo dos produtos vendidos ({periodLabels[periodFilter]})
          </p>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. TABELA DE MOVIMENTAÇÕES                                */}
      {/* ========================================================= */}
      <div className="gem-card p-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-2.5">
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
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
              className="h-10 rounded-lg border border-[#E8E4DA] bg-white px-3 text-xs sm:text-sm text-[#1F2A24] focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
            >
              {(Object.keys(typeFilterLabels) as TypeFilter[]).map((t) => (
                <option key={t} value={t}>
                  {typeFilterLabels[t]}
                </option>
              ))}
            </select>
            {(periodFilter !== 'este_mes' || typeFilter !== 'todos') && (
              <button
                onClick={() => {
                  setPeriodFilter('este_mes')
                  setTypeFilter('todos')
                }}
                className="text-[#C9A227] hover:underline font-medium text-xs"
              >
                Limpar filtros
              </button>
            )}
          </div>
          <Button
            onClick={() => setModalOpen(true)}
            className="bg-[#C9A227] hover:bg-[#A8861D] text-white font-semibold text-xs sm:text-sm h-10 px-4 flex items-center gap-1.5 shadow"
          >
            <Plus className="h-4 w-4" />
            <span>Nova Movimentação</span>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center rounded-2xl border border-[#E8E4DA] bg-white">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#C9A227] border-t-transparent" />
            <p className="text-xs text-[#6B7A70]">Carregando movimentações...</p>
          </div>
        </div>
      ) : filteredMovements.length === 0 ? (
        <div className="gem-card p-12 text-center">
          <Search className="h-10 w-10 text-[#C9A227] mx-auto opacity-50 mb-2" />
          <h4 className="font-serif text-lg font-bold text-[#1E3A2F]">
            Nenhuma movimentação encontrada
          </h4>
          <p className="text-xs text-[#6B7A70] mt-1 mb-4">
            Ajuste os filtros ou registre a primeira movimentação do período.
          </p>
          <Button
            onClick={() => setModalOpen(true)}
            className="bg-[#C9A227] hover:bg-[#A8861D] text-white font-semibold text-xs sm:text-sm h-10 px-4"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Nova Movimentação
          </Button>
        </div>
      ) : (
        <div className="gem-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[#FAF8F3] border-b border-[#E8E4DA] text-[#6B7A70] uppercase font-semibold text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-3">Descrição</th>
                  <th className="py-3 px-3 text-center">Tipo</th>
                  <th className="py-3 px-3">Categoria</th>
                  <th className="py-3 px-4 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E4DA]">
                {filteredMovements.map((m) => {
                  const st = typeBadge(m)
                  const linked = (m.expand?.products || []).map((p) => p.name)
                  return (
                    <tr key={m.id} className="hover:bg-[#FAF8F3] transition-colors">
                      <td className="py-3.5 px-4 font-medium text-[#1E3A2F] whitespace-nowrap">
                        {formatDate(m.date)}
                      </td>
                      <td className="py-3.5 px-3 text-[#1F2A24] max-w-[280px]">
                        <p className="truncate">{m.description}</p>
                        {linked.length > 0 && (
                          <p className="text-[11px] text-[#8EA598] truncate">
                            Produtos: {linked.join(', ')}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span
                          style={{ backgroundColor: st.bg, color: st.text, borderColor: st.border }}
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold border inline-flex items-center gap-1"
                        >
                          <st.Icon className="h-3 w-3" />
                          {st.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-[#1F2A24]">{categoryLabel(m.category)}</td>
                      <td
                        className={`py-3.5 px-4 text-right font-bold font-mono tabular-nums ${
                          m.type === 'entrada' ? 'text-[#3E7C4F]' : 'text-[#B3452F]'
                        }`}
                      >
                        {m.type === 'entrada' ? '+' : '−'}
                        {formatCurrency(Number(m.amount) || 0)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. DIVISÃO DE RESULTADOS (visível apenas para Admin)      */}
      {/* ========================================================= */}
      {isAdmin && (
        <ResultsSplitSection
          totalVendido={kpis.totalVendido}
          custoVendido={kpis.totalVendido - lucroLiquido}
          periodo={periodLabels[periodFilter]}
        />
      )}

      <NewMovementModal open={modalOpen} onOpenChange={setModalOpen} onSuccess={loadData} />
    </div>
  )
}

function fallbackCost(s: Sale, products: Product[]): number {
  if (!s.product) return 0
  const p = products.find((pr) => pr.id === s.product)
  return p ? (Number(p.cost) || 0) * (Number(s.quantity) || 1) : 0
}
