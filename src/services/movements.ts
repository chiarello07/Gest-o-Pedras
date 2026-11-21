import pb from '@/lib/pocketbase/client'
import type { Movement, MovementCategory, Setting } from '@/types/database'

export interface CreateMovementInput {
  type: Movement['type']
  amount: number
  description: string
  date: string
  category?: MovementCategory
  products?: string[]
}

/** Lista todas as movimentações (mais recentes primeiro), com produtos expandidos. */
export async function getMovements(options?: {
  filter?: string
  sort?: string
}): Promise<Movement[]> {
  return pb.collection('movements').getFullList<Movement>({
    filter: options?.filter,
    sort: options?.sort || '-date',
    expand: 'products',
  })
}

export async function createMovement(input: CreateMovementInput): Promise<Movement> {
  const payload: Record<string, unknown> = {
    type: input.type,
    amount: Number(input.amount) || 0,
    description: input.description,
    date: input.date,
    category: input.category || 'outro',
  }
  if (input.category === 'compra_produtos' && input.products && input.products.length > 0) {
    payload.products = input.products
  }
  return pb.collection('movements').create<Movement>(payload)
}

const RESERVA_KEY = 'financeiro_reserva_percent'

/** Percentual da reserva da empresa (padrão 10%). */
export async function getReservaPercent(): Promise<number> {
  try {
    const rec = await pb.collection('settings').getFirstListItem<Setting>(`key = "${RESERVA_KEY}"`)
    const v = Number(rec.value)
    return Number.isFinite(v) && v >= 0 && v <= 100 ? v : 10
  } catch (_) {
    return 10
  }
}

export async function setReservaPercent(percent: number): Promise<void> {
  const v = String(Math.min(Math.max(Number(percent) || 0, 0), 100))
  try {
    const rec = await pb.collection('settings').getFirstListItem<Setting>(`key = "${RESERVA_KEY}"`)
    await pb.collection('settings').update(rec.id, { value: v })
  } catch (_) {
    await pb.collection('settings').create({ key: RESERVA_KEY, value: v })
  }
}
