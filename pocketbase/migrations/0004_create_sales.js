migrate(
  (app) => {
    // =====================================================
    // 1. Nova coleção sales (vendas)
    // =====================================================
    const productsColId = app.findCollectionByNameOrId('products').id

    const sales = new Collection({
      name: 'sales',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'product',
          type: 'relation',
          required: true,
          collectionId: productsColId,
          maxSelect: 1,
        },
        { name: 'quantity', type: 'number', required: true, min: 0.1 },
        { name: 'total', type: 'number', required: true },
        {
          name: 'channel',
          type: 'select',
          required: true,
          values: ['instagram', 'whatsapp', 'loja_online', 'fisico'],
          maxSelect: 1,
        },
        { name: 'date', type: 'date', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_sales_product ON sales (product)',
        'CREATE INDEX idx_sales_date ON sales (date)',
        'CREATE INDEX idx_sales_channel ON sales (channel)',
      ],
    })
    app.save(sales)
  },
  (app) => {
    try {
      const sales = app.findCollectionByNameOrId('sales')
      app.delete(sales)
    } catch (_) {}
  },
)
