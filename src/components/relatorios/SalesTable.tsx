import { formatCurrency } from '@/components/AnimatedCounter'
import type { SaleLine } from '@/services/relatorios'
import { channelLabel } from '@/services/relatorios'
import { dateFmt, numberFmt, CHANNEL_COLORS } from './shared'

interface SalesTableProps {
  loading: boolean
  saleLines: SaleLine[]
}

/** Tabela com cada venda do período: data, cliente, canal, produtos, quantidade e valor. */
export function SalesTable({ loading, saleLines }: SalesTableProps) {
  return (
    <div className="gem-card p-5">
      <p className="text-xs font-semibold text-[#6B7A70] uppercase tracking-wider mb-3">
        Vendas do período ({saleLines.length})
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#E8E4DA]">
              {['Data', 'Cliente', 'Canal', 'Produtos', 'Qtd.', 'Valor Total'].map((h, i) => (
                <th
                  key={h}
                  className={`py-2 pr-3 font-semibold text-[#6B7A70] uppercase tracking-wider text-[10px] ${
                    i >= 4 ? 'text-right' : 'text-left'
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
                <td colSpan={6} className="py-6 text-center text-[#8EA598]">
                  Carregando…
                </td>
              </tr>
            ) : saleLines.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-[#8EA598]">
                  Nenhuma venda no período selecionado.
                </td>
              </tr>
            ) : (
              saleLines.map((l) => (
                <tr key={l.id} className="border-b border-[#E8E4DA]/60 hover:bg-[#FAF8F3]">
                  <td className="py-2.5 pr-3 text-[#1F2A24] whitespace-nowrap">
                    {dateFmt(l.date)}
                  </td>
                  <td className="py-2.5 pr-3 text-[#1F2A24]">{l.customer}</td>
                  <td className="py-2.5 pr-3">
                    <span
                      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                      style={{
                        borderColor: CHANNEL_COLORS[l.channel],
                        color: CHANNEL_COLORS[l.channel],
                      }}
                    >
                      {channelLabel(l.channel)}
                    </span>
                  </td>
                  <td
                    className="py-2.5 pr-3 text-[#1F2A24] max-w-[260px] truncate"
                    title={l.productsLabel}
                  >
                    {l.productsLabel}
                  </td>
                  <td className="py-2.5 pr-3 text-right text-[#1F2A24]">{numberFmt(l.totalQty)}</td>
                  <td className="py-2.5 text-right font-semibold text-[#1E3A2F]">
                    {formatCurrency(l.total)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
