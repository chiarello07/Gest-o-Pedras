/**
 * Configurações:
 *  1. users: adiciona o campo `status` (ativo | inativo). Usuário inativo
 *     não consegue logar (bloqueado pelo hook onAuthRequest). Também ajusta
 *     as regras da coleção para que apenas administradores autenticados
 *     gerenciem usuários, sem abrir isso para visitantes.
 *  2. settings: adiciona campos para as preferências da plataforma
 *     (nome da loja e logo) além da chave/valor já usada pela reserva.
 */
migrate(
  (app) => {
    // =====================================================
    // 1. users: campo status (ativo | inativo) + regras de acesso
    // =====================================================
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    if (!users.fields.getByName('status')) {
      users.fields.add(
        new SelectField({
          name: 'status',
          values: ['ativo', 'inativo'],
          maxSelect: 1,
        }),
      )
    }

    users.listRule = "@request.auth.role = 'admin' || @request.auth.id = id"
    users.viewRule = "@request.auth.role = 'admin' || @request.auth.id = id"
    // Criação de usuários pelo app: apenas admin autenticado.
    // (O cadastro público /criar-conta usa o caminho auth, não o createRule.)
    users.createRule = "@request.auth.role = 'admin'"
    users.updateRule =
      "@request.auth.role = 'admin' || (id = @request.auth.id && @request.body.role:changed = false && @request.body.status:changed = false)"
    users.deleteRule = "@request.auth.role = 'admin' && id != @request.auth.id"
    app.save(users)

    // Backfill idempotente: todo usuário existente vira ativo
    const existingUsers = app.findRecordsByFilter('users', '', '', 0, 0)
    for (let i = 0; i < existingUsers.length; i++) {
      const u = existingUsers[i]
      if (u.getString('status') === '') {
        u.set('status', 'ativo')
        app.save(u)
      }
    }

    // =====================================================
    // 2. settings: campos de preferências da plataforma
    // =====================================================
    const settings = app.findCollectionByNameOrId('settings')
    let settingsChanged = false

    if (!settings.fields.getByName('store_name')) {
      settings.fields.add(
        new TextField({
          name: 'store_name',
          max: 120,
        }),
      )
      settingsChanged = true
    }

    if (!settings.fields.getByName('store_logo')) {
      settings.fields.add(
        new FileField({
          name: 'store_logo',
          maxSelect: 1,
          maxSize: 5242880, // 5 MB
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
        }),
      )
      settingsChanged = true
    }

    if (settingsChanged) {
      app.save(settings)
    }
  },
  (app) => {
    // down: remove o campo de status e reverte as regras
    try {
      const users = app.findCollectionByNameOrId('_pb_users_auth_')
      if (users.fields.getByName('status')) {
        users.fields.removeByName('status')
      }
      users.listRule = 'id = @request.auth.id'
      users.viewRule = 'id = @request.auth.id'
      users.createRule = ''
      users.updateRule =
        'id = @request.auth.id && @request.body.role:changed = false && @request.body.verified:changed = false'
      users.deleteRule = 'id = @request.auth.id'
      app.save(users)
    } catch (_) {}
    try {
      const settings = app.findCollectionByNameOrId('settings')
      if (settings.fields.getByName('store_name')) {
        settings.fields.removeByName('store_name')
      }
      if (settings.fields.getByName('store_logo')) {
        settings.fields.removeByName('store_logo')
      }
      app.save(settings)
    } catch (_) {}
  },
)
