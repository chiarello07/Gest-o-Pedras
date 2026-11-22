import * as XLSX from 'xlsx'
import { formatCurrency } from '@/components/AnimatedCounter'
import { channelLabel } from '@/services/relatorios'
import type { SaleLine, ProductAgg, ChannelAgg } from '@/services/relatorios'
import type { Movement } from '@/types/database'
import { movementCategoryLabels } from '@/types/database'

export interface EstoqueRow {
  name: string
  quantity: number
  unit: string
  invested: number
  price: number
  status: string
}

export interface ComparativoRow {
  metrica: string
  atual: number
  anterior: number
  variacao: number // percentual
}

export interface ReportExportData {
  periodoLabel: string
  totalVendido: number
  lucroLiquido: number
  ticketMedio: number
  produtoMaisVendido: string
  canalTop: string
  saleLines: SaleLine[]
  productRanking: ProductAgg[]
  channels: ChannelAgg[]
  cashCurve: { date: string; entradas: number; saidas: number; saldo: number }[]
  movements: Movement[]
  estoque: EstoqueRow[]
  comparativo: ComparativoRow[]
}

const numberFmt = (v: number, decimals = 2) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })

const dateFmt = (d: string) =>
  new Date(d).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

function variacaoText(atual: number, anterior: number): string {
  if (anterior === 0) return atual === 0 ? '0%' : '— (sem base anterior)'
  return `${variacaoPct(atual, anterior)}%`
}

export function variacaoPct(atual: number, anterior: number): number {
  if (anterior === 0) return 0
  return Number((((atual - anterior) / anterior) * 100).toFixed(1))
}

/* ------------------------------------------------------------------ */
/* Excel (SheetJS) — uma planilha com os dados visíveis na tela        */
/* ------------------------------------------------------------------ */
export function exportRelatorioToExcel(data: ReportExportData): void {
  const wb = XLSX.utils.book_new()

  // Resumo
  const resumo: (string | number)[][] = [
    ['Relatório — Pedras & Cristais'],
    [`Período: ${data.periodoLabel}`],
    [],
    ['Métrica', 'Valor'],
    ['Total vendido', data.totalVendido],
    ['Lucro líquido', data.lucroLiquido],
    ['Ticket médio', data.ticketMedio],
    ['Produto mais vendido (unidades)', data.produtoMaisVendido],
    ['Canal que mais vendeu (valor)', data.canalTop],
    [],
    ['Comparativo com o período anterior', 'Atual', 'Anterior', 'Variação (%)'],
    ...data.comparativo.map((c) => [c.metrica, c.atual, c.anterior, c.variacao]),
  ]
  const wsResumo = XLSX.utils.aoa_to_sheet(resumo)
  XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo')

  // Vendas
  const vendas: (string | number)[][] = [
    ['Data', 'Cliente', 'Canal', 'Produtos', 'Quantidade', 'Valor total'],
    ...data.saleLines.map((l) => [
      dateFmt(l.date),
      l.customer,
      channelLabel(l.channel),
      l.productsLabel,
      l.totalQty,
      l.total,
    ]),
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(vendas), 'Vendas')

  // Produtos (rankings)
  const produtos: (string | number)[][] = [
    ['Produto', 'Qtd. vendida', 'Receita', 'Custo', 'Lucro'],
    ...data.productRanking.map((p) => [p.name, p.qty, p.revenue, p.cost, p.profit]),
    [],
    ['Estoque atual', 'Quantidade', 'Unidade', 'Valor investido', 'Valor de venda', 'Status'],
    ...data.estoque.map((e) => [e.name, e.quantity, e.unit, e.invested, e.price, e.status]),
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(produtos), 'Produtos')

  // Financeiro
  const financeiro: (string | number)[][] = [
    ['Curva de caixa', '', '', ''],
    ['Dia', 'Entradas', 'Saídas', 'Saldo acumulado'],
    ...data.cashCurve.map((c) => [c.date, c.entradas, c.saidas, c.saldo]),
    [],
    ['Movimentações', '', '', '', ''],
    ['Data', 'Descrição', 'Tipo', 'Categoria', 'Valor'],
    ...data.movements.map((m) => [
      dateFmt(m.date),
      m.description,
      m.type === 'entrada' ? 'Entrada' : 'Saída',
      movementCategoryLabels[m.category as keyof typeof movementCategoryLabels] ||
        (m.category as string),
      m.type === 'entrada' ? Number(m.amount) : -Number(m.amount),
    ]),
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(financeiro), 'Financeiro')

  const slug = data.periodoLabel.replace(/[^\w]+/g, '-').slice(0, 40)
  XLSX.writeFile(wb, `relatorio-${slug}.xlsx`)
}

/* ------------------------------------------------------------------ */
/* PDF — via janela de impressão (fiel ao visual, sem dependências)    */
/* ------------------------------------------------------------------ */
export function printRelatorio(data: ReportExportData): void {
  const esc = (s: unknown) =>
    String(s ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] || c,
    )
  const th = 'text-align:left;padding:6px 8px;border-bottom:2px solid #1E3A2F;font-size:11px'
  const td = 'padding:6px 8px;border-bottom:1px solid #E8E4DA;font-size:11px'
  const table = (head: string[], rows: string[][]) => `
    <table style="width:100%;border-collapse:collapse;margin:8px 0 20px">
      <thead><tr>${head.map((h) => `<th style="${th}">${esc(h)}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td style="${td}">${c}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>`

  const w = window.open('', '_blank', 'width=900,height=700')
  if (!w) return

  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" />
    <title>Relatório — ${esc(data.periodoLabel)}</title>
    <style>
      body { font-family: Georgia, serif; color: #1E3A2F; padding: 24px; }
      h1 { font-size: 20px; margin: 0; color: #1E3A2F; }
      h2 { font-size: 15px; margin: 20px 0 4px; color: #1E3A2F; border-bottom: 1px solid #C9A227; padding-bottom: 4px; }
      .sub { color: #6B7A70; font-size: 12px; }
      .cards { display: flex; gap: 10px; flex-wrap: wrap; margin: 12px 0 4px; }
      .card { border: 1px solid #E8E4DA; border-radius: 10px; padding: 8px 12px; min-width: 150px; }
      .card .k { font-size: 10px; color: #6B7A70; text-transform: uppercase; letter-spacing: 0.05em; }
      .card .v { font-size: 15px; font-weight: bold; color: #1E3A2F; }
      .pos { color: #3E7C4F; } .neg { color: #B3452F; }
      @media print { @page { margin: 14mm; } }
    </style></head><body>
    <h1>Relatório — Pedras &amp; Cristais</h1>
    <p class="sub">Período: ${esc(data.periodoLabel)} · Gerado em ${esc(
      new Date().toLocaleString('pt-BR'),
    )}</p>

    <div class="cards">
      <div class="card"><div class="k">Total vendido</div><div class="v">${esc(
        formatCurrency(data.totalVendido),
      )}</div></div>
      <div class="card"><div class="k">Lucro líquido</div><div class="v">${esc(
        formatCurrency(data.lucroLiquido),
      )}</div></div>
      <div class="card"><div class="k">Ticket médio</div><div class="v">${esc(
        formatCurrency(data.ticketMedio),
      )}</div></div>
      <div class="card"><div class="k">Produto mais vendido</div><div class="v">${esc(
        data.produtoMaisVendido,
      )}</div></div>
      <div class="card"><div class="k">Canal que mais vendeu</div><div class="v">${esc(
        data.canalTop,
      )}</div></div>
    </div>

    <h2>Comparativo com o período anterior</h2>
    ${table(
      ['Métrica', 'Atual', 'Anterior', 'Variação'],
      data.comparativo.map((c) => [
        esc(c.metrica),
        esc(formatCurrency(c.atual)),
        esc(formatCurrency(c.anterior)),
        `<span class="${c.variacao >= 0 ? 'pos' : 'neg'}">${esc(variacaoText(c.atual, c.anterior))}</span>`,
      ]),
    )}

    <h2>Curva de caixa (entradas × saídas)</h2>
    ${table(
      ['Dia', 'Entradas', 'Saídas', 'Saldo acumulado'],
      data.cashCurve.map((c) => [
        esc(c.date),
        esc(numberFmt(c.entradas)),
        esc(numberFmt(c.saidas)),
        esc(numberFmt(c.saldo)),
      ]),
    )}

    <h2>Vendas do período</h2>
    ${table(
      ['Data', 'Cliente', 'Canal', 'Produtos', 'Qtd.', 'Total'],
      data.saleLines.map((l) => [
        esc(dateFmt(l.date)),
        esc(l.customer),
        esc(channelLabel(l.channel)),
        esc(l.productsLabel),
        esc(numberFmt(l.totalQty, 0)),
        esc(formatCurrency(l.total)),
      ]),
    )}

    <h2>Produtos mais vendidos</h2>
    ${table(
      ['#', 'Produto', 'Qtd. vendida', 'Receita', 'Lucro'],
      data.productRanking
        .slice()
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 10)
        .map((p, i) => [
          esc(i + 1),
          esc(p.name),
          esc(numberFmt(p.qty, 0)),
          esc(formatCurrency(p.revenue)),
          esc(formatCurrency(p.profit)),
        ]),
    )}

    <h2>Produtos mais lucrativos</h2>
    ${table(
      ['#', 'Produto', 'Lucro', 'Receita', 'Qtd. vendida'],
      data.productRanking
        .slice()
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 10)
        .map((p, i) => [
          esc(i + 1),
          esc(p.name),
          esc(formatCurrency(p.profit)),
          esc(formatCurrency(p.revenue)),
          esc(numberFmt(p.qty, 0)),
        ]),
    )}

    <h2>Estoque atual</h2>
    ${table(
      ['Produto', 'Quantidade', 'Valor investido', 'Valor de venda', 'Status'],
      data.estoque.map((e) => [
        esc(e.name),
        esc(`${numberFmt(e.quantity, 0)} ${e.unit}`),
        esc(formatCurrency(e.invested)),
        esc(formatCurrency(e.price)),
        esc(e.status),
      ]),
    )}

    <h2>Movimentações do período</h2>
    ${table(
      ['Data', 'Descrição', 'Tipo', 'Categoria', 'Valor'],
      data.movements.map((m) => [
        esc(dateFmt(m.date)),
        esc(m.description),
        esc(m.type === 'entrada' ? 'Entrada' : 'Saída'),
        esc(
          movementCategoryLabels[m.category as keyof typeof movementCategoryLabels] ||
            (m.category as string) ||
            '—',
        ),
        `<span class="${m.type === 'entrada' ? 'pos' : 'neg'}">${esc(
          m.type === 'entrada' ? '' : '−',
        )}${esc(formatCurrency(Number(m.amount) || 0))}</span>`,
      ]),
    )}

    <script>window.onload = function () { window.print(); }</script>
  </body></html>`)
  w.document.close()
}
