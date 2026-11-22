import { TrendingDown, TrendingUp } from 'lucide-react'
import { formatCurrency } from '@/components/AnimatedCounter'
import { variacaoPct } from '@/lib/export-relatorio'

export const CHANNEL_COLORS: Record<string, string> = {
  instagram: '#C9A227',
  whatsapp: '#3E7C4F',
  loja_online: '#6FA287',
  fisico: '#A8861D',
}

export const PIE_COLORS = ['#1E3A2F', '#C9A227', '#3E7C4F', '#6FA287']

export const numberFmt = (v: number, decimals = 0) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })

export const dateFmt = (d: string) =>
  new Date(d).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

export function VariacaoPill({ atual, anterior }: { atual: number; anterior: number }) {
  if (anterior === 0) {
    return <span className="text-[11px] text-[#8EA598]">— (sem base anterior)</span>
  }
  const pct = variacaoPct(atual, anterior)
  const up = pct >= 0
  const Icon = up ? TrendingUp : TrendingDown
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
        up ? 'text-[#3E7C4F]' : 'text-[#B3452F]'
      }`}
    >
      <Icon className="h-3 w-3" />
      {up ? '+' : ''}
      {pct}%
    </span>
  )
}

export function EmptyState({ message }: { message: string }) {
  return <div className="py-10 text-center text-xs text-[#8EA598]">{message}</div>
}

export const TOOLTIP_STYLE = { borderRadius: 10, borderColor: '#E8E4DA', fontSize: 12 } as const
