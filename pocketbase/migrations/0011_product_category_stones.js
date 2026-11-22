/**
 * 0011 — Categoria de produto + pedras (composição).
 *
 * 1. Troca o campo select `category` para a nova lista obrigatória:
 *    decoracao, joia, kit, acessorio, base, outros
 *    (antiga: ametista, quartzo, decoracao, joia, outros).
 * 2. Adiciona o campo multi-select `stones` (até 8): ametista, agata, pirita,
 *    selenita, cianita, quartzo, obsidiana, outras — opcional.
 * 3. Converte os registros existentes: categoria mapeada para a mais próxima
 *    da nova lista (ametista/quartzo → decoracao) e pedras derivadas do nome.
 *
 * Idempotente: em uma base vazia (estado atual pós-0010) ou em qualquer
 * cópia/restore do projeto, a conversão simplesmente não encontra registros.
 */
migrate(
  (app) => {
    // ===== 1. Atualiza o campo select `category` =====
    // PocketBase restringe os valores armazenados quando a lista do select é
    // salva, então a mudança precisa ser feita em duas etapas: primeiro os
    // registros antigos são convertidos (via SQL, contornando a validação),
    // depois a lista nova é aplicada ao campo.
    const products = app.findCollectionByNameOrId('products')

    app
      .db()
      .newQuery(
        "UPDATE products SET category = 'decoracao' WHERE category IN ('ametista', 'quartzo')",
      )
      .execute()

    const categoryField = products.fields.getByName('category')
    categoryField.values = ['decoracao', 'joia', 'kit', 'acessorio', 'base', 'outros']
    app.save(products)

    // ===== 2. Novo campo multi-select `stones` =====
    if (!products.fields.getByName('stones')) {
      products.fields.add(
        new SelectField({
          name: 'stones',
          maxSelect: 8,
          values: [
            'ametista',
            'agata',
            'pirita',
            'selenita',
            'cianita',
            'quartzo',
            'obsidiana',
            'outras',
          ],
        }),
      )
      app.save(products)
    }

    // ===== 3. Deriva as pedras do nome dos registros existentes =====
    var stoneKeywords = [
      ['ametista', ['ametista']],
      ['agata', ['ágata', 'agata']],
      ['pirita', ['pirita']],
      ['selenita', ['selenita']],
      ['cianita', ['cianita']],
      ['quartzo', ['quartzo', 'quartz']],
      ['obsidiana', ['obsidiana']],
    ]

    var existing = app.findRecordsByFilter('products', '', '', 0, 0)
    existing.forEach(function (record) {
      var name = (record.getString('name') || '').toLowerCase()
      if (!name) return
      var stones = []
      stoneKeywords.forEach(function (pair) {
        var keywords = pair[1]
        for (var i = 0; i < keywords.length; i++) {
          if (name.indexOf(keywords[i]) !== -1) {
            stones.push(pair[0])
            break
          }
        }
      })
      record.set('stones', stones)
      app.save(record)
    })
  },
  (app) => {
    // Revert: volta a lista antiga de categorias e remove o campo `stones`.
    const products = app.findCollectionByNameOrId('products')

    app
      .db()
      .newQuery(
        "UPDATE products SET category = 'outros' WHERE category NOT IN ('decoracao', 'joia', 'outros')",
      )
      .execute()

    const categoryField = products.fields.getByName('category')
    categoryField.values = ['ametista', 'quartzo', 'decoracao', 'joia', 'outros']
    app.save(products)
    if (products.fields.getByName('stones')) {
      products.fields.removeByName('stones')
      app.save(products)
    }
  },
)
