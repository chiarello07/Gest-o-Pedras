import { PackageOpen } from 'lucide-react'
import type { Product } from '@/types/database'

/**
 * Resumo compacto dos componentes de um kit — usado na tabela e nos cards
 * de estoque (Produtos e Dashboard), mostrando a disponibilidade de cada
 * componente além da quantidade própria (kits não têm estoque próprio).
 */
export default function KitComponentsSummary({
  product,
  productsIndex,
}: {
  product: Product
  productsIndex: Record<string, Product>
}) {
  const ids = (product.components || []).filter(
    (id, i, arr) => id && id !== product.id && arr.indexOf(id) === i,
  )
  if (ids.length === 0) {
    return <p className="text-[11px] text-[#8EA598] italic">Sem componentes vinculados.</p>
  }

  return (
    <div className="flex flex-col items-end gap-0.5 mt-0.5">
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#8E7118] uppercase tracking-wide">
        <PackageOpen className="h-3 w-3 text-[#C9A227]" />
        Componentes
      </span>
      {ids.map((id) => {
        const comp = productsIndex[id]
        const qty = comp ? Number(comp.quantity) || 0 : null
        return (
          <span
            key={id}
            className={`text-[11px] leading-tight ${qty !== null && qty <= 0 ? 'text-[#B3452F]' : 'text-[#6B7A70]'}`}
          >
            {comp
              ? `${comp.name}: ${qty} ${comp.unit === 'peso' ? 'kg' : 'un.'}`
              : 'Componente removido'}
          </span>
        )
      })}
    </div>
  )
}
