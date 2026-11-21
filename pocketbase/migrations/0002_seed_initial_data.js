migrate(
  (app) => {
    // 1. Usuário inicial: christianochiarello@gmail.com / Skip@Pass
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'christianochiarello@gmail.com')
    } catch (_) {
      const userRecord = new Record(users)
      userRecord.setEmail('christianochiarello@gmail.com')
      userRecord.setPassword('Skip@Pass')
      userRecord.setVerified(true)
      userRecord.set('name', 'Christian')
      app.save(userRecord)
    }

    // 2. Mock products (6 produtos)
    const productsCol = app.findCollectionByNameOrId('products')
    const initialProducts = [
      {
        name: 'Ametista Drusa Uruguai',
        description: 'Drusa natural com pontas profundas, peça de destaque para vitrine.',
        quantity: 4,
        unit: 'peso',
        cost: 850,
        price: 1400,
        category: 'ametista',
      },
      {
        name: 'Quartzo Rosa Bruto',
        description: 'Pedra bruta polida, ideal para coleção e decoração.',
        quantity: 18,
        unit: 'unidade',
        cost: 22,
        price: 45,
        category: 'quartzo',
      },
      {
        name: 'Citrino Lapidado',
        description: 'Ponta lapidada com brilho dourado, 4–6 cm.',
        quantity: 24,
        unit: 'unidade',
        cost: 18,
        price: 42,
        category: 'quartzo',
      },
      {
        name: 'Geodo de Ágata Decorativo',
        description: 'Geodo aberto com interior cristalizado, base cortada.',
        quantity: 6,
        unit: 'unidade',
        cost: 210,
        price: 380,
        category: 'decoracao',
      },
      {
        name: 'Colar de Ametista Prata 925',
        description: 'Joia artesanal com cristal de ametista facetado e prata de lei 925.',
        quantity: 8,
        unit: 'unidade',
        cost: 95,
        price: 189,
        promo_price: 149,
        category: 'joia',
      },
      {
        name: 'Ponta de Cristal Transparente',
        description: 'Ponta de quartzo transparente para cura e meditação.',
        quantity: 0,
        unit: 'unidade',
        cost: 35,
        price: 78,
        category: 'quartzo',
      },
    ]

    for (let i = 0; i < initialProducts.length; i++) {
      const item = initialProducts[i]
      try {
        app.findFirstRecordByData('products', 'name', item.name)
      } catch (_) {
        const prodRecord = new Record(productsCol)
        prodRecord.set('name', item.name)
        prodRecord.set('description', item.description)
        prodRecord.set('quantity', item.quantity)
        prodRecord.set('unit', item.unit)
        prodRecord.set('cost', item.cost)
        prodRecord.set('price', item.price)
        if (item.promo_price !== undefined) {
          prodRecord.set('promo_price', item.promo_price)
        }
        prodRecord.set('category', item.category)
        app.save(prodRecord)
      }
    }

    // 3. Mock movements (7 dias de movimentações realistas para somar ~R$ 12.000 de caixa)
    const movementsCol = app.findCollectionByNameOrId('movements')
    const existingMovements = app.findRecordsByFilter('movements', '', '', 1, 0)
    if (existingMovements.length === 0) {
      const now = new Date()
      // Gera datas relativas para os últimos 7 dias (dia -6 até dia 0)
      const baseDailyData = [
        {
          dayOffset: 6,
          entrada: { desc: 'Venda — Drusa Ametista e Geodo', amount: 2850 },
          saida: { desc: 'Compra — Lote de Cristais Brutos', amount: 920 },
        },
        {
          dayOffset: 5,
          entrada: { desc: 'Venda — 4x Colar Ametista Prata 925', amount: 596 },
          saida: { desc: 'Frete de fornecedor internacional', amount: 180 },
        },
        {
          dayOffset: 4,
          entrada: { desc: 'Venda — Cristais Citrino e Quartzo Rosa', amount: 1680 },
          saida: { desc: 'Embalagens especiais e caixas de veludo', amount: 340 },
        },
        {
          dayOffset: 3,
          entrada: { desc: 'Venda — Geodo Decorativo Peça Rara', amount: 2450 },
          saida: { desc: 'Manutenção de iluminação e vitrine', amount: 290 },
        },
        {
          dayOffset: 2,
          entrada: { desc: 'Venda — Lote Quartzo Rosa Colecionador', amount: 1950 },
          saida: { desc: 'Aluguel parcial do atelier de lapidação', amount: 850 },
        },
        {
          dayOffset: 1,
          entrada: { desc: 'Venda — Peças Lapidadas e Joias', amount: 3120 },
          saida: { desc: 'Seguro de transporte de gemas', amount: 410 },
        },
        {
          dayOffset: 0,
          entrada: { desc: 'Vendas do dia — Loja e Atelier', amount: 2240 },
          saida: { desc: 'Insumos de limpeza e polimento', amount: 190 },
        },
      ]

      // Total Entradas: 2850+596+1680+2450+1950+3120+2240 = 14886
      // Total Saidas: 920+180+340+290+850+410+190 = 3180
      // Saldo Caixa: 14886 - 3180 = R$ 11.706 (~R$ 12.000)

      for (let i = 0; i < baseDailyData.length; i++) {
        const d = baseDailyData[i]
        const targetDate = new Date(now.getTime() - d.dayOffset * 24 * 60 * 60 * 1000)
        const dateStr = targetDate.toISOString().split('T')[0] + ' 12:00:00.000Z'

        // Entrada
        const recEntrada = new Record(movementsCol)
        recEntrada.set('type', 'entrada')
        recEntrada.set('amount', d.entrada.amount)
        recEntrada.set('description', d.entrada.desc)
        recEntrada.set('date', dateStr)
        app.save(recEntrada)

        // Saída
        const recSaida = new Record(movementsCol)
        recSaida.set('type', 'saida')
        recSaida.set('amount', d.saida.amount)
        recSaida.set('description', d.saida.desc)
        recSaida.set('date', dateStr)
        app.save(recSaida)
      }
    }
  },
  (app) => {
    // down migration
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'christianochiarello@gmail.com')
      app.delete(user)
    } catch (_) {}
  },
)
