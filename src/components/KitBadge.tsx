import { PackageOpen } from 'lucide-react'

/**
 * Etiqueta dourada "Kit" reutilizada nas telas de vendas, produtos e
 * dashboard — mantém o visual dourado/verde da plataforma.
 */
export function KitBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-[#C9A227]/15 text-[#8E7118] border border-[#C9A227]/40 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${className}`}
    >
      <PackageOpen className="h-3 w-3" />
      Kit
    </span>
  )
}
