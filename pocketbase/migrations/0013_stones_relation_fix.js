/**
 * 0013 — Corretiva da 0012: troca efetivamente o campo `stones` de `products`
 * para relation → coleção `stones`.
 *
 * A 0012 foi aplicada mas o PocketBase rejeitou silenciosamente a troca
 * (remove + add no mesmo ciclo de validação), então o campo ainda está como
 * select. Esta migração remove o campo select, salva, e recria o mesmo nome
 * como relation multi-select para `stones` — em passos separados e com
 * verificação de tipo, idempotente.
 */
migrate(
  (app) => {
    const products = app.findCollectionByNameOrId('products')
    const stonesField = products.fields.getByName('stones')

    if (stonesField && stonesField.type !== 'relation') {
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
    // Revert não-op: a 0012 já reverteu para select; nada a fazer aqui.
  },
)
