/**
 * 0010 — Limpeza dos dados mockados/de exemplo.
 *
 * Apaga TODOS os registros das coleções operacionais (sale_items, sales,
 * movements, products — nesta ordem, respeitando as relações), mantendo a
 * estrutura das coleções intacta. NÃO altera `users` (perfis admin/gestor
 * permanecem) nem `settings` (preferências da loja são preservadas).
 *
 * Idempotente: em uma base já vazia (ou em qualquer cópia do projeto), a
 * remoção não encontra registros e a migração é um no-op.
 */
migrate(
  (app) => {
    const order = ['sale_items', 'sales', 'movements', 'products']

    for (const name of order) {
      if (!app.hasTable(name)) continue
      const col = app.findCollectionByNameOrId(name)

      let removed = 0
      // Loop até esvaziar (limite por chamada, para bases maiores que o batch)
      for (;;) {
        const records = app.findRecordsByFilter(name, '', '-created', 200, 0)
        if (!records || records.length === 0) break
        for (const rec of records) {
          app.delete(rec)
          removed++
        }
      }
      console.log('[0010] ' + name + ': ' + removed + ' registro(s) removido(s)')
    }
  },
  (app) => {
    // Down: sem restauração de dados (os seeds originais são recriáveis apenas
    // pelas migrações 0002/0005/0006 em uma base nova). No-op proposital.
  },
)
