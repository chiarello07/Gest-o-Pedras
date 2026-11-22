/**
 * 0012 — Pedras como coleção própria (`stones`) e campo `stones` do produto
 * como relação multi-select para ela.
 *
 * 1. Cria a coleção `stones` (nome único, cor em hex) com as 8 pedras atuais
 *    como seed — regras: leitura para usuários autenticados, escrita também
 *    autenticada (o app cria pedras novas inline no cadastro de produtos).
 * 2. Troca o campo `stones` de `products` de select para relation para
 *    `stones` (maxSelect 30, opcional). Como a base está vazia desde a
 *    limpeza (0010), não há o que converter; mesmo assim, se houver valores
 *    no antigo campo select (cópia/restore com dados), eles são mapeados por
 *    nome normalizado para o id do registro correspondente antes da troca.
 *
 * Idempotente: em uma base vazia ou em qualquer cópia/restore do projeto, o
 * seed pula as pedras que já existem e a conversão não encontra registros.
 */
migrate(
  (app) => {
    // ===== 1. Coleção `stones` =====
    let stonesCol
    try {
      stonesCol = app.findCollectionByNameOrId('stones')
    } catch (_) {
      stonesCol = null
    }

    if (!stonesCol) {
      stonesCol = new Collection({
        name: 'stones',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'name', type: 'text', required: true, min: 2, max: 60 },
          // chave de unicidade: nome em minúsculas, sem espaços duplos
          { name: 'slug', type: 'text', required: true, min: 2, max: 60 },
          // cor hex para a tag (ex.: #6B4FA0)
          { name: 'color', type: 'text', required: false, max: 9 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_stones_slug ON stones (slug)'],
      })
      app.save(stonesCol)
    }

    // ===== 2. Seed das 8 pedras atuais =====
    // Paleta sóbria da plataforma (verde/dourado + tons discretos, os mesmos
    // já usados nas tags fixas).
    var seedStones = [
      ['ametista', 'Ametista', '#6B4FA0'],
      ['agata', 'Ágata', '#B3452F'],
      ['pirita', 'Pirita', '#8E7118'],
      ['selenita', 'Selenita', '#3D6B9E'],
      ['cianita', 'Cianita', '#2F6D7C'],
      ['quartzo', 'Quartzo', '#3E7C4F'],
      ['obsidiana', 'Obsidiana', '#444444'],
      ['outras', 'Outras', '#55665C'],
    ]

    for (var i = 0; i < seedStones.length; i++) {
      var slug = seedStones[i][0]
      try {
        app.findFirstRecordByFilter('stones', "slug = '{:slug}'".replace('{:slug}', slug))
      } catch (_) {
        var rec = new Record(app.findCollectionByNameOrId('stones'))
        rec.set('name', seedStones[i][1])
        rec.set('slug', slug)
        rec.set('color', seedStones[i][2])
        app.save(rec)
      }
    }

    // ===== 3. products.stones: select → relation =====
    const products = app.findCollectionByNameOrId('products')
    const stonesField = products.fields.getByName('stones')

    if (stonesField && stonesField.type === 'select') {
      // Mapeia valores antigos do select (se houver) para ids da tabela stones,
      // antes de trocar o tipo do campo.
      const stonesRecords = app.findRecordsByFilter('stones', '', '', 0, 0)
      const bySlug = {}
      stonesRecords.forEach(function (r) {
        bySlug[r.getString('slug')] = r.id
      })

      // nome do produto → slugs (mesma heurística da migração 0011)
      var keywordMap = [
        ['ametista', ['ametista']],
        ['agata', ['ágata', 'agata']],
        ['pirita', ['pirita']],
        ['selenita', ['selenita']],
        ['cianita', ['cianita']],
        ['quartzo', ['quartzo', 'quartz']],
        ['obsidiana', ['obsidiana']],
        ['outras', ['outras', 'outra']],
      ]

      var existingProducts = app.findRecordsByFilter('products', '', '', 0, 0)
      existingProducts.forEach(function (product) {
        var slugs = []
        var oldValues = product.getStringSlice('stones')
        if (oldValues && oldValues.length > 0) {
          for (var j = 0; j < oldValues.length; j++) {
            if (bySlug[oldValues[j]] && slugs.indexOf(bySlug[oldValues[j]]) === -1) {
              slugs.push(bySlug[oldValues[j]])
            }
          }
        } else {
          var productName = (product.getString('name') || '').toLowerCase()
          if (productName) {
            keywordMap.forEach(function (pair) {
              for (var k = 0; k < pair[1].length; k++) {
                if (productName.indexOf(pair[1][k]) !== -1) {
                  var relId = bySlug[pair[0]]
                  if (relId && slugs.indexOf(relId) === -1) slugs.push(relId)
                  break
                }
              }
            })
          }
        }
        if (slugs.length > 0) {
          app
            .db()
            .newQuery('UPDATE products SET stones = {:ids} WHERE id = {:id}')
            .bind({ ids: JSON.stringify(slugs), id: product.id })
            .execute()
        }
      })

      // Agora troca o tipo do campo: remove o select e cria a relation com o
      // mesmo nome (PB não permite mudar o tipo de um campo diretamente).
      products.fields.removeByName('stones')
      app.save(products)

      products.fields.add(
        new RelationField({
          name: 'stones',
          collectionId: app.findCollectionByNameOrId('stones').id,
          cascadeDelete: false,
          minSelect: 0,
          maxSelect: 30,
          required: false,
        }),
      )
      app.save(products)
    } else if (!stonesField) {
      products.fields.add(
        new RelationField({
          name: 'stones',
          collectionId: app.findCollectionByNameOrId('stones').id,
          cascadeDelete: false,
          minSelect: 0,
          maxSelect: 30,
          required: false,
        }),
      )
      app.save(products)
    }
  },
  (app) => {
    // Revert: volta o campo `stones` para o select original e remove a coleção.
    const products = app.findCollectionByNameOrId('products')
    app.db().newQuery("UPDATE products SET stones = '[]'").execute()

    if (products.fields.getByName('stones')) {
      products.fields.removeByName('stones')
      app.save(products)
    }

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

    try {
      const stonesCol = app.findCollectionByNameOrId('stones')
      app.delete(stonesCol)
    } catch (_) {}
  },
)
