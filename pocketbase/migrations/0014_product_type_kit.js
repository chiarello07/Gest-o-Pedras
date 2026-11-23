/**
 * 0014 — Tipo do produto: Individual ou Kit (componentes).
 *
 * 1. `product_type`: select (individual | kit), padrão `individual` — é o TIPO
 *    estrutural do item, distinto da categoria comercial (`category`, que já
 *    tem a opção "kit").
 * 2. `components`: relation multi para a própria coleção `products` — os
 *    produtos que compõem o kit. Cada componente representa 1 unidade dentro
 *    do kit (kit com 2x o mesmo produto = repetir o id na lista).
 *
 * A base está vazia de dados reais desde a limpeza (0010), não há o que
 * migrar/compatibilizar — só estrutura. Idempotente: adiciona cada campo
 * apenas se ele ainda não existir.
 */
migrate(
  (app) => {
    const products = app.findCollectionByNameOrId('products')

    if (!products.fields.getByName('product_type')) {
      products.fields.add(
        new SelectField({
          name: 'product_type',
          required: true,
          maxSelect: 1,
          values: ['individual', 'kit'],
        }),
      )
      app.save(products)
    }

    if (!products.fields.getByName('components')) {
      products.fields.add(
        new RelationField({
          name: 'components',
          collectionId: products.id,
          cascadeDelete: false,
          minSelect: 0,
          maxSelect: 99,
          required: false,
        }),
      )
      app.save(products)
    }
  },
  (app) => {
    const products = app.findCollectionByNameOrId('products')
    for (const name of ['components', 'product_type']) {
      if (products.fields.getByName(name)) {
        products.fields.removeByName(name)
      }
    }
    app.save(products)
  },
)
