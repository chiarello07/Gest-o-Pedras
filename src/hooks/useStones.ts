import { useCallback, useEffect, useState } from 'react'

import type { Stone } from '@/types/database'
import { findOrCreateStone, getStones } from '@/services/stones'
import { useRealtime } from '@/hooks/use-realtime'

/**
 * Lista de pedras da coleção `stones`, com realtime. Usada pelo
 * StoneTagInput (sugestões) e pelas telas que exibem as tags de pedra.
 */
export function useStones() {
  const [stones, setStones] = useState<Stone[]>([])
  const [loading, setLoading] = useState(true)

  const fetchStones = useCallback(async () => {
    try {
      const list = await getStones()
      setStones(list)
    } catch (err) {
      console.error('Erro ao buscar pedras:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStones()
  }, [fetchStones])

  useRealtime<Stone>('stones', () => {
    fetchStones()
  })

  const createStone = useCallback(async (name: string): Promise<Stone> => {
    const stone = await findOrCreateStone(name)
    // Realtime também atualiza, mas o refresh imediato evita tela defasada.
    setStones((prev) =>
      prev.some((s) => s.id === stone.id) ? prev : [...prev, stone].sort(byName),
    )
    return stone
  }, [])

  return { stones, loading, createStone, refresh: fetchStones }
}

function byName(a: Stone, b: Stone) {
  return a.name.localeCompare(b.name, 'pt-BR')
}

export default useStones
