migrate(
  (app) => {
    // =====================================================
    // 1. products: campo de status disponível/esgotado
    // =====================================================
    const products = app.findCollectionByNameOrId('products')
    if (!products.fields.getByName('status')) {
      products.fields.add(
        new SelectField({
          name: 'status',
          values: ['disponivel', 'esgotado'],
          maxSelect: 1,
        }),
      )
    }
    app.save(products)

    // Backfill idempotente: deriva o status da quantidade em estoque
    const prods = app.findRecordsByFilter('products', '', '', 0, 0)
    for (let i = 0; i < prods.length; i++) {
      const p = prods[i]
      if (p.getString('status') === '') {
        p.set('status', p.getFloat('quantity') > 0 ? 'disponivel' : 'esgotado')
        app.save(p)
      }
    }

    // =====================================================
    // 2. movements: categoria da movimentação
    // =====================================================
    const movements = app.findCollectionByNameOrId('movements')
    if (!movements.fields.getByName('category')) {
      movements.fields.add(
        new SelectField({
          name: 'category',
          values: ['venda', 'compra', 'despesa', 'outros'],
          maxSelect: 1,
        }),
      )
    }
    app.save(movements)

    // Backfill idempotente: categoriza movimentações existentes
    const moves = app.findRecordsByFilter('movements', '', '', 0, 0)
    for (let i = 0; i < moves.length; i++) {
      const m = moves[i]
      if (m.getString('category') === '') {
        const desc = m.getString('description').toLowerCase()
        if (m.getString('type') === 'entrada') {
          m.set('category', desc.includes('venda') ? 'venda' : 'outros')
        } else {
          if (desc.includes('compra')) m.set('category', 'compra')
          else m.set('category', 'despesa')
        }
        app.save(m)
      }
    }

    // =====================================================
    // 3. users: perfil de acesso (admin | gestor)
    // =====================================================
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    if (!users.fields.getByName('role')) {
      users.fields.add(
        new SelectField({
          name: 'role',
          values: ['admin', 'gestor'],
          maxSelect: 1,
        }),
      )
    }
    // Bloqueia auto-elevação de perfil pela própria API pública
    users.updateRule =
      'id = @request.auth.id && @request.body.role:changed = false && @request.body.verified:changed = false'
    app.save(users)

    // Backfill idempotente: o primeiro usuário do atelier é admin;
    // os demais que ficarem sem perfil viram gestor
    const existingUsers = app.findRecordsByFilter('users', '', 'created', 0, 0)
    for (let i = 0; i < existingUsers.length; i++) {
      const u = existingUsers[i]
      if (u.getString('role') === '') {
        u.set('role', i === 0 ? 'admin' : 'gestor')
        app.save(u)
      }
    }
  },
  (app) => {
    // down: remove os campos adicionados (apenas se existirem)
    try {
      const products = app.findCollectionByNameOrId('products')
      if (products.fields.getByName('status')) {
        products.fields.removeByName('status')
        app.save(products)
      }
    } catch (_) {}
    try {
      const movements = app.findCollectionByNameOrId('movements')
      if (movements.fields.getByName('category')) {
        movements.fields.removeByName('category')
        app.save(movements)
      }
    } catch (_) {}
    try {
      const users = app.findCollectionByNameOrId('_pb_users_auth_')
      if (users.fields.getByName('role')) {
        users.fields.removeByName('role')
        app.save(users)
      }
    } catch (_) {}
  },
)
