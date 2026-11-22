import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { formatCurrency } from '@/components/AnimatedCounter'
import type { SaleLine, ChannelAgg } from '@/services/relatorios'
import { channelLabel } from '@/services/relatorios'
import { EmptyState, TOOLTIP_STYLE, PIE_COLORS } from './shared'

interface SalesSectionProps {
  loading: boolean
  saleLines: SaleLine[]
  channels: ChannelAgg[]
}

/** Gráfico de vendas por dia (barras) + pizza por canal + tabela de vendas. */
export function SalesCharts({ loading, saleLines, channels }: SalesSectionProps) {
  const byDay = new Map<string, number>()
  for (const l of saleLines) {
    const day = new Date(l.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    byDay.set(day, (byDay.get(day) || 0) + l.total)
  }
  const salesByDay = Array.from(byDay.entries()).map(([day, total]) => ({ day, total }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Vendas por dia */}
      <div className="gem-card p-5 lg:col-span-2">
        <p className="text-xs font-semibold text-[#6B7A70] uppercase tracking-wider mb-3">
          Vendas por dia no período
        </p>
        {loading ? (
          <EmptyState message="Carregando…" />
        ) : salesByDay.length === 0 ? (
          <EmptyState message="Nenhuma venda no período selecionado." />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={salesByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E4DA" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="#8EA598" />
              <YAxis tick={{ fontSize: 10 }} stroke="#8EA598" />
              <Tooltip
                formatter={(v) => [formatCurrency(Number(v)), 'Vendido']}
                contentStyle={TOOLTIP_STYLE}
              />
              <Bar dataKey="total" name="Vendido" fill="#3E7C4F" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Vendas por canal (pizza) */}
      <div className="gem-card p-5">
        <p className="text-xs font-semibold text-[#6B7A70] uppercase tracking-wider mb-3">
          Vendas por canal
        </p>
        {loading ? (
          <EmptyState message="Carregando…" />
        ) : channels.length === 0 ? (
          <EmptyState message="Nenhuma venda no período." />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={channels.map((c) => ({ name: channelLabel(c.channel), value: c.total }))}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                outerRadius={85}
                paddingAngle={2}
              >
                {channels.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
