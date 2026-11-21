/**
 * Financeiro:
 *  1. Adiciona o campo de relação opcional `products` na coleção `movements`,
 *     para vincular compras de produtos ("categoria = compra") aos itens do
 *     estoque já cadastrados (multi-seleção).
 *  2. Cria a coleção `settings` (chave/valor simples) para persistir
 *     configurações da tela Financeiro (ex.: percentual da reserva da empresa).
 */
migrate(
  (app) => {
    // 1. Campo products em movements (relação opcional com products)
    const movements = app.findCollectionByNameOrId('movements')
    if (!movements.fields.getByName('products')) {
      movements.fields.add(
        new RelationField({
          name: 'products',
          collectionId: app.findCollectionByNameOrId('products').id,
          cascadeDelete: false,
          minSelect: 0,
          maxSelect: 99,
          required: false,
        }),
      )
      app.save(movements)
    }

    // 2. Coleção settings (chave/valor)
    try {
      app.findCollectionByNameOrId('settings')
      return // já existe
    } catch (_) {}

    const collection = new Collection({
      name: 'settings',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'key', type: 'text', required: true, min: 1, max: 100 },
        { name: 'value', type: 'text', required: false, max: 1000 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_settings_key ON settings (key)'],
    })
    app.save(collection)

    // Valor padrão sensato: reserva de 10% para a empresa
    const record = new Record(collection)
    record.set('key', 'financeiro_reserva_percent')
    record.set('value', '10')
    app.save(record)
  },
  (app) => {
    const movements = app.findCollectionByNameOrId('movements')
    const field = movements.fields.getByName('products')
    if (field) {
      movements.fields.removeByName('products')
      app.save(movements)
    }
    try {
      const settings = app.findCollectionByNameOrId('settings')
      app.delete(settings)
    } catch (_) {}
  },
)
