migrate(
  (app) => {
    // =====================================================
    // 1. Campos novos na coleção sales
    // =====================================================
    const sales = app.findCollectionByNameOrId('sales')

    if (!sales.fields.getByName('customer')) {
      sales.fields.add(new TextField({ name: 'customer', max: 200 }))
    }

    if (!sales.fields.getByName('status')) {
      sales.fields.add(
        new SelectField({
          name: 'status',
          values: ['concluida', 'pendente', 'cancelada'],
          maxSelect: 1,
        }),
      )
    }

    // product/quantity viram opcionais (vendido como sale_items)
    const productField = sales.fields.getByName('product')
    if (productField) productField.required = false
    const quantityField = sales.fields.getByName('quantity')
    if (quantityField) quantityField.required = false

    app.save(sales)

    // =====================================================
    // 2. Nova coleção sale_items (itens do pedido multi-itens)
    // =====================================================
    if (!app.hasTable('sale_items')) {
      const productsColId = app.findCollectionByNameOrId('products').id

      const saleItems = new Collection({
        name: 'sale_items',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'sale',
            type: 'relation',
            required: true,
            collectionId: app.findCollectionByNameOrId('sales').id,
            maxSelect: 1,
            cascadeDelete: true,
          },
          {
            name: 'product',
            type: 'relation',
            required: true,
            collectionId: productsColId,
            maxSelect: 1,
          },
          { name: 'quantity', type: 'number', required: true, min: 0.1 },
          { name: 'unit_price', type: 'number', required: true },
          { name: 'subtotal', type: 'number', required: true },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_sale_items_sale ON sale_items (sale)',
          'CREATE INDEX idx_sale_items_product ON sale_items (product)',
        ],
      })
      app.save(saleItems)
    }

    // =====================================================
    // 3. Backfill idempotente das vendas de exemplo (0005)
    // =====================================================
    const existingItems = app.findRecordsByFilter('sale_items', '', '', 1, 0)
    if (existingItems.length > 0) return

    const legacySales = app.findRecordsByFilter('sales', 'product != ""', '-created', 0, 0)
    const saleItemsCol = app.findCollectionByNameOrId('sale_items')

    for (const sale of legacySales) {
      const productId = sale.getString('product')
      const quantity = sale.getFloat('quantity')
      const total = sale.getFloat('total')
      if (!productId || quantity <= 0) continue

      let unitPrice = total / quantity
      try {
        const prod = app.findRecordById('products', productId)
        const promo = prod.getFloat('promo_price')
        unitPrice = promo > 0 ? promo : prod.getFloat('price')
      } catch (_) {}

      const item = new Record(saleItemsCol)
      item.set('sale', sale.id)
      item.set('product', productId)
      item.set('quantity', quantity)
      item.set('unit_price', unitPrice)
      item.set('subtotal', total)
      app.save(item)

      // status padrão nas vendas antigas
      sale.set('status', 'concluida')
      app.save(sale)
    }
  },
  (app) => {
    try {
      const items = app.findCollectionByNameOrId('sale_items')
      app.delete(items)
    } catch (_) {}
  },
)
