import { stoneLabels, stoneStyles } from '@/lib/labels'
import type { ProductStone } from '@/types/database'

/**
 * Etiqueta discreta com as pedras que compõem o produto.
 * Some quando o produto não tem nenhuma pedra (base, led, sacola...).
 */
export function ProductStoneTags({ stones }: { stones?: ProductStone[] }) {
  if (!stones || stones.length === 0) return null

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {stones.map((stone) => {
        const style = stoneStyles[stone]
        if (!style) return null
        return (
          <span
            key={stone}
            style={{
              backgroundColor: style.bg,
              color: style.text,
              borderColor: style.border,
            }}
            className="px-2 py-0.5 rounded-full text-[10px] font-medium border"
          >
            {stoneLabels[stone] || stone}
          </span>
        )
      })}
    </span>
  )
}
