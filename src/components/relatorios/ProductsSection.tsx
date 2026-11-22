import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { formatCurrency } from '@/components/AnimatedCounter'
import type { ProductAgg } from '@/services/relatorios'
import { EmptyState, TOOLTIP_STYLE, numberFmt } from './shared'
import type { EstoqueRow } from '@/lib/export-relatorio'

interface ProductsSectionProps {
  loading: boolean
  productRanking: ProductAgg[]
  estoque: EstoqueRow[]
}

/** Rankings (quantidade e lucro) + tabela de estoque atual. */
export function ProductsSection({ loading, productRanking, estoque }: ProductsSectionProps) {
  const byQty = productRanking
    .slice()
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 8)
  const byProfit = productRanking
    .slice()
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 8)

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Ranking por quantidade */}
        <div className="gem-card p-5">
          <p className="text-xs font-semibold text-[#6B7A70] uppercase tracking-wider mb-3">
            Mais vendidos em quantidade
          </p>
          {loading ? (
            <EmptyState message="Carregando…" />
          ) : byQty.length === 0 ? (
            <EmptyState message="Nenhuma venda no período." />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={byQty.map((p) => ({ name: p.name, qty: p.qty }))} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E4DA" />
                <XAxis type="number" tick={{ fontSize: 10 }} stroke="#8EA598" />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  tick={{ fontSize: 10 }}
                  stroke="#8EA598"
                />
                <Tooltip
                  formatter={(v) => [numberFmt(Number(v)), 'Unidades']}
                  contentStyle={TOOLTIP_STYLE}
                />
                <Bar dataKey="qty" name="Unidades" fill="#C9A227" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Ranking por lucro */}
        <div className="gem-card p-5">
          <p className="text-xs font-semibold text-[#6B7A70] uppercase tracking-wider mb-3">
            Mais lucrativos em valor
          </p>
          {loading ? (
            <EmptyState message="Carregando…" />
          ) : byProfit.length === 0 ? (
            <EmptyState message="Nenhuma venda no período." />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={byProfit.map((p) => ({ name: p.name, profit: p.profit }))}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E4DA" />
                <XAxis type="number" tick={{ fontSize: 10 }} stroke="#8EA598" />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  tick={{ fontSize: 10 }}
                  stroke="#8EA598"
                />
                <Tooltip
                  formatter={(v) => [formatCurrency(Number(v)), 'Lucro']}
                  contentStyle={TOOLTIP_STYLE}
                />
                <Bar dataKey="profit" name="Lucro" fill="#3E7C4F" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Estoque atual */}
      <div className="gem-card p-5">
        <p className="text-xs font-semibold text-[#6B7A70] uppercase tracking-wider mb-3">
          Estoque atual ({estoque.length} produtos)
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#E8E4DA]">
                {['Produto', 'Quantidade', 'Valor investido', 'Valor de venda', 'Status'].map(
                  (h, i) => (
                    <th
                      key={h}
                      className={`py-2 pr-3 font-semibold text-[#6B7A70] uppercase tracking-wider text-[10px] ${
                        i === 0 ? 'text-left' : 'text-right'
                      }`}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-[#8EA598]">
                    Carregando…
                  </td>
                </tr>
              ) : estoque.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-[#8EA598]">
                    Nenhum produto cadastrado.
                  </td>
                </tr>
              ) : (
                estoque.map((e) => (
                  <tr key={e.name} className="border-b border-[#E8E4DA]/60 hover:bg-[#FAF8F3]">
                    <td className="py-2.5 pr-3 font-medium text-[#1E3A2F]">{e.name}</td>
                    <td className="py-2.5 pr-3 text-right text-[#1F2A24]">
                      {numberFmt(e.quantity)} {e.unit}
                    </td>
                    <td className="py-2.5 pr-3 text-right text-[#1F2A24]">
                      {formatCurrency(e.invested)}
                    </td>
                    <td className="py-2.5 pr-3 text-right text-[#1F2A24]">
                      {formatCurrency(e.price)}
                    </td>
                    <td className="py-2.5 text-right">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                          e.status === 'Disponível'
                            ? 'border-[#CFE0D4] bg-[#EFF3F0] text-[#3E7C4F]'
                            : 'border-[#EBBBB3] bg-[#F7EBEA] text-[#B3452F]'
                        }`}
                      >
                        {e.status}
                      </span>
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
