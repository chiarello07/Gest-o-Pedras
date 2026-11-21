import pb from '@/lib/pocketbase/client'
import type { Movement } from '@/types/database'

export async function getMovements(options?: {
  filter?: string
  sort?: string
  limit?: number
}): Promise<Movement[]> {
  return pb.collection('movements').getFullList<Movement>({
    filter: options?.filter,
    sort: options?.sort || '-date',
  })
}

export async function getLast7DaysMovements(): Promise<Movement[]> {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  const isoLimit = d.toISOString().split('T')[0] + ' 00:00:00.000Z'

  return pb.collection('movements').getFullList<Movement>({
    filter: `date >= "${isoLimit}"`,
    sort: 'date',
  })
}
