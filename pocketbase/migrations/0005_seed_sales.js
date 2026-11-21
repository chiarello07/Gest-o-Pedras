migrate(
  (app) => {
    // =====================================================
    // Seed de vendas de exemplo — idempotente (no-op se já
    // existirem registros na coleção sales)
    // =====================================================
    const salesCol = app.findCollectionByNameOrId('sales')

    let alreadySeeded = false
    try {
      app.findFirstRecordByFilter('sales', '')
      alreadySeeded = true
    } catch (_) {
      alreadySeeded = false
    }
    if (alreadySeeded) return

    // Produtos pelo nome (independe de id de ambiente)
    const findProduct = (name) => {
      try {
        return app.findFirstRecordByFilter('products', `name = "${name}"`)
      } catch (_) {
        return null
      }
    }

    const catalog = {
      drusa: findProduct('Ametista Drusa Uruguai'),
      colar: findProduct('Colar de Ametista Prata 925'),
      citrino: findProduct('Citrino Lapidado'),
      rosa: findProduct('Quartzo Rosa Bruto'),
      geodo: findProduct('Geodo de Ágata Decorativo'),
    }

    const day = (offset) => {
      const d = new Date()
      d.setUTCDate(d.getUTCDate() - offset)
      return d.toISOString().replace('T', ' ').slice(0, 19) + 'Z'
    }

    const seedSales = [
      { key: 'drusa', quantity: 1, total: 1400, channel: 'instagram', date: day(6) },
      { key: 'colar', quantity: 2, total: 298, channel: 'whatsapp', date: day(5) },
      { key: 'citrino', quantity: 3, total: 126, channel: 'fisico', date: day(5) },
      { key: 'rosa', quantity: 4, total: 180, channel: 'loja_online', date: day(4) },
      { key: 'geodo', quantity: 1, total: 380, channel: 'fisico', date: day(3) },
      { key: 'colar', quantity: 1, total: 149, channel: 'instagram', date: day(3) },
      { key: 'citrino', quantity: 5, total: 210, channel: 'loja_online', date: day(2) },
      { key: 'rosa', quantity: 2, total: 90, channel: 'whatsapp', date: day(2) },
      { key: 'drusa', quantity: 1, total: 1400, channel: 'loja_online', date: day(1) },
      { key: 'colar', quantity: 1, total: 149, channel: 'fisico', date: day(0) },
      { key: 'citrino', quantity: 2, total: 84, channel: 'instagram', date: day(0) },
      { key: 'geodo', quantity: 1, total: 380, channel: 'whatsapp', date: day(0) },
    ]

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19) + 'Z'

    for (const s of seedSales) {
      const product = catalog[s.key]
      if (!product) continue

      const sale = new Record(salesCol)
      sale.set('product', product.id)
      sale.set('quantity', s.quantity)
      sale.set('total', s.total)
      sale.set('channel', s.channel)
      sale.set('date', s.date)
      sale.set('created', now)
      sale.set('updated', now)
      app.save(sale)
    }
  },
  (app) => {},
)
