/**
 * pb_hook: finalização de venda
 *
 * Quando um registro é criado na coleção `sales` (via API pública, autenticado),
 * este hook:
 *   1. lê os itens enviados em `items` (JSON array: [{ product, quantity, unit_price }]),
 *   2. valida estoque e preços (unit_price = promo_price > 0 ? promo_price : price),
 *   3. cria os registros em `sale_items`,
 *   4. decrementa a `quantity` de cada produto em `products` (floor 0),
 *   5. recalcula o `total` da venda a partir dos itens.
 *
 * Vendas legadas (item único via campo `product`) continuam funcionando: se
 * `items` não vier, o hook não interfere (o client grava product/quantity/total direto).
 */
onRecordCreate((e) => {
  const raw = e.record.getString('items')
  if (!raw) {
    e.next()
    return
  }

  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch (_) {
    throw new BadRequestError('O campo items deve ser um JSON válido.')
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new BadRequestError('A venda precisa ter pelo menos um item.')
  }

  const saleItemsCol = app.findCollectionByNameOrId('sale_items')
  let total = 0
  const prepared = []

  app.runInTransaction((tx) => {
    for (const item of parsed) {
      const productId = item && item.product ? String(item.product) : ''
      const quantity = Number(item && item.quantity) || 0

      if (!productId || quantity <= 0) {
        throw new BadRequestError('Todo item precisa de produto e quantidade válidos.')
      }

      let product
      try {
        product = tx.findRecordById('products', productId)
      } catch (_) {
        throw new BadRequestError('Produto não encontrado no estoque.')
      }

      const promo = product.getFloat('promo_price')
      const expectedPrice = promo > 0 ? promo : product.getFloat('price')
      const unitPrice = Number(item.unit_price) > 0 ? Number(item.unit_price) : expectedPrice

      const available = product.getFloat('quantity')
      if (quantity > available) {
        throw new BadRequestError('Estoque insuficiente para "' + product.getString('name') + '".')
      }

      const subtotal = unitPrice * quantity
      total += subtotal
      prepared.push({ product, quantity, unitPrice, subtotal })
    }

    // Cria os itens e decrementa o estoque atomicamente
    for (const p of prepared) {
      const saleItem = new Record(saleItemsCol)
      saleItem.set('sale', e.record.id)
      saleItem.set('product', p.product.id)
      saleItem.set('quantity', p.quantity)
      saleItem.set('unit_price', p.unitPrice)
      saleItem.set('subtotal', p.subtotal)
      tx.save(saleItem)

      const newQty = Math.max(p.product.getFloat('quantity') - p.quantity, 0)
      p.product.set('quantity', newQty)
      tx.save(p.product)
    }

    // Total recalculado a partir dos itens
    e.record.set('total', total)
    e.record.set('items', '')
    tx.save(e.record)
  })

  // Estado final para a resposta e para o realtime
  e.record.set('total', total)
  e.record.set('items', '')
  e.next()
}, 'sales')
