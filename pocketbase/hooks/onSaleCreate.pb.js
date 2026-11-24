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
 * KITS (product_type = 'kit'):
 *   - o kit não tem estoque próprio (quantity fica em 0); o estoque disponível
 *     dele = mínimo entre (estoque do componente ÷ unidades do componente no kit).
 *   - ao vender 1 kit, cada COMPONENTE tem sua quantity baixada (1 unidade por
 *     ocorrência do componente no kit); a quantity do próprio kit não é baixada.
 *   - sale_items registra o item como o kit (product = id do kit, unit_price =
 *     preço próprio do kit), mantendo a consistência dos relatórios/financeiro.
 *
 * Vendas legadas (item único via campo `product`) continuam funcionando: se
 * `items` não vier, o hook não interfere (o client grava product/quantity/total direto).
 */
onRecordCreate((e) => {
  // `items` é campo json: pode chegar como array nativo (SDK serializa) ou,
  // de clientes antigos, como string JSON (inclusive dupla-serializada).
  let raw = e.record.getString('items')
  if (!raw) {
    e.next()
    return
  }

  let parsed
  try {
    parsed = JSON.parse(raw)
    // Aceita a forma nativa (campo json) e a string simples/dupla de clientes antigos
    if (typeof parsed === 'string') parsed = JSON.parse(parsed)
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
    // Baixas de estoque agregadas por produto: { id: { record, qty } }
    const decQty = {}

    function addDecrement(record, qty) {
      const id = record.id
      if (!decQty[id]) {
        decQty[id] = { record, qty: 0 }
      }
      decQty[id].qty += qty
    }

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

      const isKit = product.getString('product_type') === 'kit'
      let available

      if (isKit) {
        // Estoque do kit = mínimo entre (estoque do componente ÷ ocorrências)
        const componentIds = product.getStringSlice('components').filter(function (id) {
          return id && id !== product.id
        })
        if (componentIds.length === 0) {
          // Kit sem componentes vinculados: sem estoque controlado, vende livre
          available = Infinity
        } else {
          const needed = {}
          const comps = {}
          componentIds.forEach(function (id) {
            needed[id] = (needed[id] || 0) + 1
          })
          available = Infinity
          for (const id in needed) {
            try {
              comps[id] = tx.findRecordById('products', id)
            } catch (_) {
              continue // componente removido: ignora na validação
            }
            const compAvailable = Math.floor(comps[id].getFloat('quantity') / needed[id])
            if (compAvailable < available) available = compAvailable
          }
          if (quantity > available) {
            throw new BadRequestError(
              'Estoque insuficiente de componentes para o kit "' + product.getString('name') + '".',
            )
          }
          // A baixa é sempre nos COMPONENTES: 1 unidade por ocorrência no kit,
          // multiplicada pela quantidade de kits vendidos.
          for (const id in comps) {
            addDecrement(comps[id], needed[id] * quantity)
          }
        }
      } else {
        available = product.getFloat('quantity')
        if (quantity > available) {
          throw new BadRequestError(
            'Estoque insuficiente para "' + product.getString('name') + '".',
          )
        }
        addDecrement(product, quantity)
      }

      const subtotal = unitPrice * quantity
      total += subtotal
      prepared.push({ product, quantity, unitPrice, subtotal })
    }

    // Cria os itens; estoque só é baixado dos componentes (agregado por produto)
    for (const p of prepared) {
      const saleItem = new Record(saleItemsCol)
      saleItem.set('sale', e.record.id)
      saleItem.set('product', p.product.id)
      saleItem.set('quantity', p.quantity)
      saleItem.set('unit_price', p.unitPrice)
      saleItem.set('subtotal', p.subtotal)
      tx.save(saleItem)
    }

    for (const id in decQty) {
      const entry = decQty[id]
      const newQty = Math.max(entry.record.getFloat('quantity') - entry.qty, 0)
      entry.record.set('quantity', newQty)
      tx.save(entry.record)
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
