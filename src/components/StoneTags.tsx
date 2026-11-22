import type { Stone } from '@/types/database'
import { stoneTagColor, stoneTagColorByName } from '@/lib/stone-colors'

/**
 * Etiqueta discreta com as pedras que compõem o produto.
 * Some quando o produto não tem nenhuma pedra (base, led, sacola...).
 * Recebe `stonesIndex` (mapa id → Stone) carregado pela tela via useStones();
 * pedras não encontradas no mapa caem para a cor determinística por nome.
 */
export function ProductStoneTags({
  stones,
  stonesIndex,
}: {
  stones?: string[]
  stonesIndex?: Record<string, Stone>
}) {
  if (!stones || stones.length === 0) return null

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {stones.map((stoneId) => {
        const stone = stonesIndex?.[stoneId]
        const label = stone?.name ?? stoneId
        const style = stone ? stoneTagColor(stone) : stoneTagColorByName(stoneId)

        return (
          <span
            key={stoneId}
            style={{
              backgroundColor: style.bg,
              color: style.text,
              borderColor: style.border,
            }}
            className="px-2 py-0.5 rounded-full text-[10px] font-medium border"
          >
            {label}
          </span>
        )
      })}
    </span>
  )
}
