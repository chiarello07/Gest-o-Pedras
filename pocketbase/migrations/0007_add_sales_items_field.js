migrate(
  (app) => {
    // Campo `items` na coleção sales: JSON transitório enviado pelo client
    // ([{ product, quantity, unit_price }]). O pb_hook processa, cria os
    // sale_items e limpa o campo. `hidden: false` para o client poder gravar.
    const sales = app.findCollectionByNameOrId('sales')
    if (!sales.fields.getByName('items')) {
      sales.fields.add(new JSONField({ name: 'items', maxSize: 200000 }))
      app.save(sales)
    }
  },
  (app) => {
    const sales = app.findCollectionByNameOrId('sales')
    const field = sales.fields.getByName('items')
    if (field) {
      sales.fields.removeByName('items')
      app.save(sales)
    }
  },
)
