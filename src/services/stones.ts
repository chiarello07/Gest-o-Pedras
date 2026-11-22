import pb from '@/lib/pocketbase/client'
import type { Stone } from '@/types/database'

/**
 * Cria uma pedra nova na coleção `stones` (se ainda não existir) e devolve o
 * registro — existente ou recém-criado. A comparação é pelo slug normalizado.
 */
export async function findOrCreateStone(name: string): Promise<Stone> {
  const trimmed = name.trim()
  const slug = slugifyStoneName(trimmed)

  if (!slug) throw new Error('Nome de pedra inválido.')

  try {
    return await pb.collection<Stone>('stones').getFirstListItem<Stone>(`slug = "${slug}"`)
  } catch {
    // não encontrada — cria abaixo
  }

  return pb.collection<Stone>('stones').create<Stone>({ name: trimmed, slug })
}

export async function getStones(): Promise<Stone[]> {
  return pb.collection<Stone>('stones').getFullList<Stone>({ sort: 'name' })
}

/** Normaliza um nome de pedra para o slug usado na busca/criação. */
export function slugifyStoneName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
