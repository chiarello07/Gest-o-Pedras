migrate(
  (app) => {
    // 1. Coleção products
    const products = new Collection({
      name: 'products',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'description', type: 'text' },
        { name: 'quantity', type: 'number' },
        {
          name: 'unit',
          type: 'select',
          required: true,
          values: ['unidade', 'peso'],
          maxSelect: 1,
        },
        { name: 'cost', type: 'number', required: true },
        { name: 'price', type: 'number', required: true },
        { name: 'promo_price', type: 'number' },
        {
          name: 'category',
          type: 'select',
          required: true,
          values: ['ametista', 'quartzo', 'decoracao', 'joia', 'outros'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_products_category ON products (category)',
        'CREATE INDEX idx_products_name ON products (name)',
      ],
    })
    app.save(products)

    // 2. Coleção movements
    const movements = new Collection({
      name: 'movements',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'type',
          type: 'select',
          required: true,
          values: ['entrada', 'saida'],
          maxSelect: 1,
        },
        { name: 'amount', type: 'number', required: true },
        { name: 'description', type: 'text', required: true },
        { name: 'date', type: 'date', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_movements_date ON movements (date)',
        'CREATE INDEX idx_movements_type ON movements (type)',
      ],
    })
    app.save(movements)
  },
  (app) => {
    try {
      const products = app.findCollectionByNameOrId('products')
      app.delete(products)
    } catch (_) {}
    try {
      const movements = app.findCollectionByNameOrId('movements')
      app.delete(movements)
    } catch (_) {}
  },
)
