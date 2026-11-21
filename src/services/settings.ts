import pb from '@/lib/pocketbase/client'

export interface StoreSettings {
  id: string
  store_name: string
  store_logo: string
}

/** Nome usado para o registro de preferências da loja dentro de `settings`. */
export const STORE_RECORD_KEY = 'platform'

const SETTINGS_URL = '/api/collections/settings/records'

function fileUrl(record: StoreSettings): string {
  if (!record.store_logo) return ''
  return pb.files.getURL(record, record.store_logo)
}

/**
 * Lê as preferências da loja (nome e logo). Cria o registro
 * "platform" na primeira execução, se ainda não existir.
 */
export async function getStoreSettings(): Promise<{ storeName: string; logoUrl: string }> {
  const list = await pb.collection('settings').getList<StoreSettings>(1, 1, {
    filter: `key = "${STORE_RECORD_KEY}"`,
  })

  let record = list.items[0]
  if (!record) {
    record = await pb.collection('settings').create<StoreSettings>({
      key: STORE_RECORD_KEY,
    })
  }

  return {
    storeName: record.store_name || '',
    logoUrl: fileUrl(record),
  }
}

/** Salva o nome da loja (e/ou um novo logo). */
export async function saveStoreSettings(input: {
  recordId: string
  storeName?: string
  logoFile?: File | null
  removeLogo?: boolean
}): Promise<void> {
  const form = new FormData()
  if (input.storeName !== undefined) {
    form.append('store_name', input.storeName)
  }
  if (input.logoFile) {
    form.append('store_logo', input.logoFile)
  }
  if (input.removeLogo) {
    form.append('store_logo', '')
  }

  const res = await fetch(`${pb.buildURL('')}${SETTINGS_URL}/${input.recordId}`, {
    method: 'PATCH',
    headers: {
      Authorization: pb.authStore.token,
    },
    body: form,
  })

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null
    throw new Error(body?.message || 'Não foi possível salvar as preferências da loja.')
  }
}

/** Busca o registro bruto (para saber o id ao salvar). */
export async function getStoreSettingsRecord(): Promise<StoreSettings | null> {
  const list = await pb.collection('settings').getList<StoreSettings>(1, 1, {
    filter: `key = "${STORE_RECORD_KEY}"`,
  })
  return list.items[0] || null
}
