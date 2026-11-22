import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  FileBarChart2,
  Download,
  Loader2,
  ShoppingBag,
  TrendingUp,
  TrendingDown,
  Ticket,
  Receipt,
  Package,
  SignalHigh,
  Wallet,
  RefreshCw,
  FileSpreadsheet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AnimatedCounter, formatCurrency } from '@/components/AnimatedCounter'
import { useAuth } from '@/context/AuthContext'
import {
  useRelatoriosData,
  periodOptions,
  periodOptionLabels,
  resolvePeriod,
  type PeriodOption,
} from '@/hooks/use-relatorios'
import { channelLabel } from '@/services/relatorios'
import {
  exportRelatorioToExcel,
  printRelatorio,
  variacaoPct,
  type ComparativoRow,
} from '@/lib/export-relatorio'
import { EmptyState, numberFmt } from '@/components/relatorios/shared'
import { SalesCharts } from '@/components/relatorios/SalesCharts'
import { SalesTable } from '@/components/relatorios/SalesTable'
import { ProductsSection } from '@/components/relatorios/ProductsSection'
import { FinancialSection } from '@/components/relatorios/FinancialSection'
import type { EstoqueRow } from '@/lib/export-relatorio'

export default function Relatorios() {
  const { role } = useAuth()
  const [period, setPeriod] = useState<PeriodOption>('ultimos30')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [applied, setApplied] = useState<{ p: PeriodOption; s: string; e: string }>({
    p: 'ultimos30',
    s: '',
    e: '',
  })

  const isManager = role ? role !== 'admin' : false

  const periodRange = useMemo(() => resolvePeriod(applied.p, applied.s, applied.e), [applied])
  const data = useRelatoriosData(
    isManager
      ? {
          start: new Date(),
          end: new Date(),
          prev: { start: new Date(), end: new Date() },
          label: '—',
        }
      : periodRange,
  )

  const topProduct = data.productRanking.slice().sort((a, b) => b.qty - a.qty)[0]
  const topChannel = data.channels[0]

  const estoque: EstoqueRow[] = useMemo(
    () =>
      data.products
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
        .map((p) => {
          const qty = Number(p.quantity) || 0
          const invested = qty * (Number(p.cost) || 0)
          const price =
            Number((p as unknown as { promo_price?: number }).promo_price) > 0
              ? Number((p as unknown as { promo_price?: number }).promo_price)
              : Number(p.price) || 0
          const status = qty <= 0 ? 'Esgotado' : 'Disponível'
          return {
            name: p.name,
            quantity: qty,
            unit: p.unit === 'peso' ? 'g' : 'un',
            invested,
            price,
            status,
          }
        }),
    [data.products],
  )

  const comparativo: ComparativoRow[] = useMemo(
    () => [
      {
        metrica: 'Total vendido',
        atual: data.totals.totalVendido,
        anterior: data.totals.prevTotalVendido,
        variacao: variacaoPct(data.totals.totalVendido, data.totals.prevTotalVendido),
      },
      {
        metrica: 'Lucro líquido',
        atual: data.totals.lucroLiquido,
        anterior: data.totals.prevLucroLiquido,
        variacao: variacaoPct(data.totals.lucroLiquido, data.totals.prevLucroLiquido),
      },
      {
        metrica: 'Entradas de caixa',
        atual: data.totals.entradas,
        anterior: data.totals.prevEntradas,
        variacao: variacaoPct(data.totals.entradas, data.totals.prevEntradas),
      },
      {
        metrica: 'Saídas de caixa',
        atual: data.totals.saidas,
        anterior: data.totals.prevSaidas,
        variacao: variacaoPct(data.totals.saidas, data.totals.prevSaidas),
      },
      {
        metrica: 'Saldo de caixa',
        atual: data.totals.saldo,
        anterior: data.totals.prevSaldo,
        variacao: variacaoPct(data.totals.saldo, data.totals.prevSaldo),
      },
    ],
    [data.totals],
  )

  const exportData = () => ({
    periodoLabel: periodRange.label,
    totalVendido: data.totals.totalVendido,
    lucroLiquido: data.totals.lucroLiquido,
    ticketMedio: data.totals.ticketMedio,
    produtoMaisVendido: topProduct ? `${topProduct.name} (${numberFmt(topProduct.qty)} un)` : '—',
    canalTop: topChannel
      ? `${channelLabel(topChannel.channel)} (${formatCurrency(topChannel.total)})`
      : '—',
    saleLines: data.saleLines,
    productRanking: data.productRanking,
    channels: data.channels,
    cashCurve: data.cashCurve,
    movements: data.movements,
    estoque,
    comparativo,
  })

  const gerarRelatorio = () => setApplied({ p: period, s: customStart, e: customEnd })

  // Gestor não acessa Relatórios — redireciona para o Dashboard (padrão das outras telas)
  if (isManager) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="space-y-6 animate-crystalline pb-12">
      {/* Cabeçalho com Exportar */}
      <div className="gem-card p-5 sm:p-6 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-[#1E3A2F]/10 blur-2xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#1E3A2F] text-[#C9A227] shadow-md">
            <FileBarChart2 className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#1E3A2F]">
              Relatórios do Atelier
            </h2>
            <p className="text-xs sm:text-sm text-[#6B7A70] mt-0.5">
              Vendas, produtos e finanças consolidadas no período selecionado.
            </p>
          </div>
          <div className="sm:ml-auto flex items-center gap-2">
            <Button
              onClick={() => exportRelatorioToExcel(exportData())}
              className="h-9 px-3 bg-[#EFF3F0] hover:bg-[#E2EBE5] text-[#1E3A2F] text-xs font-semibold border border-[#CFE0D4] flex items-center gap-1.5"
            >
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </Button>
            <Button
              onClick={() => printRelatorio(exportData())}
              className="h-9 px-3 bg-[#C9A227] hover:bg-[#A8861D] text-white text-xs font-semibold flex items-center gap-1.5"
            >
              <Download className="h-4 w-4" /> Exportar PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="gem-card p-5 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[#6B7A70] uppercase tracking-wider">
              Período
            </label>
            <Select value={period} onValueChange={(v) => setPeriod(v as PeriodOption)}>
              <SelectTrigger className="h-9 rounded-lg border-[#E8E4DA] text-xs focus:ring-[#C9A227]">
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map((p) => (
                  <SelectItem key={p} value={p} className="text-xs">
                    {periodOptionLabels[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {period === 'personalizado' && (
            <>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[#6B7A70] uppercase tracking-wider">
                  Início
                </label>
                <Input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="h-9 rounded-lg border-[#E8E4DA] text-xs focus:ring-[#C9A227]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[#6B7A70] uppercase tracking-wider">
                  Fim
                </label>
                <Input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="h-9 rounded-lg border-[#E8E4DA] text-xs focus:ring-[#C9A227]"
                />
              </div>
            </>
          )}

          <Button
            onClick={gerarRelatorio}
            className="h-9 px-4 bg-[#C9A227] hover:bg-[#A8861D] text-white text-xs font-semibold flex items-center gap-1.5 lg:col-start-5"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Gerar Relatório
          </Button>
        </div>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <div className="gem-card p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#6B7A70] uppercase tracking-wider">
              Total Vendido
            </p>
            <p className="font-serif text-2xl font-bold text-[#1E3A2F] mt-1">
              {data.loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-[#C9A227]" />
              ) : (
                <AnimatedCounter value={data.totals.totalVendido} prefix="R$ " />
              )}
            </p>
          </div>
          <div className="h-10 w-10 shrink-0 rounded-xl bg-[#FAF3E0] text-[#C9A227] flex items-center justify-center">
            <Receipt className="h-5 w-5" />
          </div>
        </div>

        <div className="gem-card p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#6B7A70] uppercase tracking-wider">
              Lucro Líquido
            </p>
            <p className="font-serif text-2xl font-bold text-[#3E7C4F] mt-1">
              {data.loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-[#3E7C4F]" />
              ) : (
                <AnimatedCounter value={data.totals.lucroLiquido} prefix="R$ " />
              )}
            </p>
          </div>
          <div className="h-10 w-10 shrink-0 rounded-xl bg-[#EFF3F0] text-[#3E7C4F] flex items-center justify-center">
            <Wallet className="h-5 w-5" />
          </div>
        </div>

        <div className="gem-card p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#6B7A70] uppercase tracking-wider">
              Produto Mais Vendido
            </p>
            <p className="font-serif text-lg font-bold text-[#1E3A2F] mt-1 truncate">
              {data.loading ? '…' : topProduct?.name || '—'}
            </p>
            <p className="text-[10px] text-[#8EA598]">
              {topProduct ? `${numberFmt(topProduct.qty)} unidades` : ''}
            </p>
          </div>
          <div className="h-10 w-10 shrink-0 rounded-xl bg-[#EFF3F0] text-[#3E7C4F] flex items-center justify-center">
            <Package className="h-5 w-5" />
          </div>
        </div>

        <div className="gem-card p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#6B7A70] uppercase tracking-wider">
              Canal que Mais Vendeu
            </p>
            <p className="font-serif text-lg font-bold text-[#1E3A2F] mt-1 truncate">
              {data.loading ? '…' : topChannel ? channelLabel(topChannel.channel) : '—'}
            </p>
            <p className="text-[10px] text-[#8EA598]">
              {topChannel ? formatCurrency(topChannel.total) : ''}
            </p>
          </div>
          <div className="h-10 w-10 shrink-0 rounded-xl bg-[#FAF3E0] text-[#C9A227] flex items-center justify-center">
            <SignalHigh className="h-5 w-5" />
          </div>
        </div>

        <div className="gem-card p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#6B7A70] uppercase tracking-wider">
              Ticket Médio
            </p>
            <p className="font-serif text-2xl font-bold text-[#1E3A2F] mt-1">
              {data.loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-[#C9A227]" />
              ) : (
                <AnimatedCounter value={data.totals.ticketMedio} prefix="R$ " />
              )}
            </p>
          </div>
          <div className="h-10 w-10 shrink-0 rounded-xl bg-[#EFF3F0] text-[#3E7C4F] flex items-center justify-center">
            <Ticket className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Período ativo */}
      <p className="text-[11px] text-[#6B7A70] -mt-2">
        Período: <span className="font-semibold text-[#1E3A2F]">{periodRange.label}</span> ·
        Comparativo com o período anterior de mesma duração
      </p>

      {/* ===================== RELATÓRIO DE VENDAS ===================== */}
      <section className="space-y-4">
        <h3 className="font-serif text-lg font-bold text-[#1E3A2F] flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-[#C9A227]" /> Relatório de Vendas
        </h3>
        <SalesCharts loading={data.loading} saleLines={data.saleLines} channels={data.channels} />
        <SalesTable loading={data.loading} saleLines={data.saleLines} />
      </section>

      {/* ===================== RELATÓRIO DE PRODUTOS ===================== */}
      <section className="space-y-4">
        <h3 className="font-serif text-lg font-bold text-[#1E3A2F] flex items-center gap-2">
          <Package className="h-5 w-5 text-[#C9A227]" /> Relatório de Produtos
        </h3>
        <ProductsSection
          loading={data.loading}
          productRanking={data.productRanking}
          estoque={estoque}
        />
      </section>

      {/* ===================== RELATÓRIO FINANCEIRO ===================== */}
      <section className="space-y-4">
        <h3 className="font-serif text-lg font-bold text-[#1E3A2F] flex items-center gap-2">
          <Wallet className="h-5 w-5 text-[#C9A227]" /> Relatório Financeiro
        </h3>
        <FinancialSection
          loading={data.loading}
          cashCurve={data.cashCurve}
          movements={data.movements}
          comparativo={comparativo}
          saleLines={data.saleLines}
        />
      </section>
    </div>
  )
}
