/**
 * pb_hook: controle de usuários (Configurações)
 *
 *  1. onRecordAuthRequest: bloqueia o login de usuários com status "inativo"
 *     — a mensagem genérica evita revelar quais contas existem.
 *  2. onRecordCreateRequest / onRecordUpdateRequest (coleção users):
 *     - Impede que um admin remova o próprio acesso admin.
 *     - Impede que um admin desative a própria conta.
 *     - Usuários recém-criados pelo app já nascem com status "ativo"
 *       (caso o client não envie o campo).
 */
onRecordAuthRequest((e) => {
  const status = e.record.getString('status')
  if (status === 'inativo') {
    throw new UnauthorizedError('Esta conta está desativada. Fale com o administrador.')
  }
  e.next()
}, 'users')

onRecordCreateRequest((e) => {
  if (e.record.getString('status') === '') {
    e.record.set('status', 'ativo')
  }
  if (e.record.getString('role') === '') {
    e.record.set('role', 'gestor')
  }
  e.next()
}, 'users')

onRecordUpdateRequest((e) => {
  const isSelf = e.auth && e.auth.id === e.record.id
  if (isSelf) {
    if (e.record.getString('role') !== 'admin' || e.record.getString('status') === 'inativo') {
      throw new BadRequestError(
        'Você não pode remover seu próprio acesso admin nem desativar a sua conta.',
      )
    }
  }
  e.next()
}, 'users')
