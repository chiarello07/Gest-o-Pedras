import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { formatCurrency } from '@/components/AnimatedCounter'
import type { Movement } from '@/types/database'
import { movementCategoryLabels } from '@/types/database'
import type { ComparativoRow } from '@/lib/export-relatorio'
import { EmptyState, TOOLTIP_STYLE, VariacaoPill, dateFmt } from './shared'
import type { SaleLine } from '@/services/relatorios'
import { channelLabel } from '@/services/relatorios'

interface FinancialSectionProps {
  loading: boolean
  cashCurve: { date: string; entradas: number; saidas: number; saldo: number }[]
  movements: Movement[]
  comparativo: ComparativoRow[]
  saleLines: SaleLine[]
}

/** Curva de caixa, comparativo com o período anterior e tabela de movimentações. */
export function FinancialSection({
  loading,
  cashCurve,
  movements,
  comparativo,
  saleLines,
}: FinancialSectionProps) {
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Curva de caixa */}
        <div className="gem-card p-5">
          <p className="text-xs font-semibold text-[#6B7A70] uppercase tracking-wider mb-3">
            Curva de caixa no período
          </p>
          {loading ? (
            <EmptyState message="Carregando…" />
          ) : cashCurve.length === 0 ? (
            <EmptyState message="Nenhuma movimentação ou venda no período." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={cashCurve}>
                <defs>
                  <linearGradient id="gradEntradas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3E7C4F" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#3E7C4F" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradSaidas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#B3452F" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#B3452F" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E4DA" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#8EA598" />
                <YAxis tick={{ fontSize: 10 }} stroke="#8EA598" />
                <Tooltip
                  formatter={(v) => formatCurrency(Number(v))}
                  contentStyle={TOOLTIP_STYLE}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area
                  type="monotone"
                  dataKey="entradas"
                  name="Entradas"
                  stroke="#3E7C4F"
                  fill="url(#gradEntradas)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="saidas"
                  name="Saídas"
                  stroke="#B3452F"
                  fill="url(#gradSaidas)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Comparativo entre períodos */}
        <div className="gem-card p-5">
          <p className="text-xs font-semibold text-[#6B7A70] uppercase tracking-wider mb-3">
            Comparativo com o período anterior
          </p>
          {loading ? (
            <EmptyState message="Carregando…" />
          ) : (
            <div className="space-y-3">
              {comparativo.map((c) => (
                <div
                  key={c.metrica}
                  className="flex items-center justify-between rounded-xl border border-[#E8E4DA] bg-[#FAF8F3] px-4 py-2.5"
                >
                  <div>
                    <p className="text-xs font-semibold text-[#1E3A2F]">{c.metrica}</p>
                    <p className="text-[10px] text-[#8EA598]">
                      {formatCurrency(c.atual)} · antes {formatCurrency(c.anterior)}
                    </p>
                  </div>
                  <VariacaoPill atual={c.atual} anterior={c.anterior} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Movimentações */}
      <div className="gem-card p-5">
        <p className="text-xs font-semibold text-[#6B7A70] uppercase tracking-wider mb-3">
          Movimentações do período ({movements.length})
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#E8E4DA]">
                {['Data', 'Descrição', 'Tipo', 'Categoria', 'Valor'].map((h, i) => (
                  <th
                    key={h}
                    className={`py-2 pr-3 font-semibold text-[#6B7A70] uppercase tracking-wider text-[10px] ${
                      i === 4 ? 'text-right' : 'text-left'
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-[#8EA598]">
                    Carregando…
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-[#8EA598]">
                    Nenhuma movimentação no período.
                  </td>
                </tr>
              ) : (
                movements.map((m) => (
                  <tr key={m.id} className="border-b border-[#E8E4DA]/60 hover:bg-[#FAF8F3]">
                    <td className="py-2.5 pr-3 text-[#1F2A24] whitespace-nowrap">
                      {dateFmt(m.date)}
                    </td>
                    <td
                      className="py-2.5 pr-3 text-[#1F2A24] max-w-[240px] truncate"
                      title={m.description}
                    >
                      {m.description}
                    </td>
                    <td className="py-2.5 pr-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                          m.type === 'entrada'
                            ? 'border-[#CFE0D4] bg-[#EFF3F0] text-[#3E7C4F]'
                            : 'border-[#EBBBB3] bg-[#F7EBEA] text-[#B3452F]'
                        }`}
                      >
                        {m.type === 'entrada' ? 'Entrada' : 'Saída'}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-[#1F2A24]">
                      {movementCategoryLabels[m.category as keyof typeof movementCategoryLabels] ||
                        (m.category as string) ||
                        '—'}
                    </td>
                    <td
                      className={`py-2.5 text-right font-semibold ${
                        m.type === 'entrada' ? 'text-[#3E7C4F]' : 'text-[#B3452F]'
                      }`}
                    >
                      {m.type === 'entrada' ? '+' : '−'}
                      {formatCurrency(Number(m.amount) || 0)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
