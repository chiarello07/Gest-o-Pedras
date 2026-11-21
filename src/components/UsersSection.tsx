import { useCallback, useEffect, useState } from 'react'
import { UserPlus, ShieldCheck, ShieldOff, Loader2, UserCog } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/context/AuthContext'
import {
  createUser,
  listUsers,
  setUserStatus,
  updateUser,
  type ManagedUser,
} from '@/services/users'
import { getErrorMessage } from '@/lib/pocketbase/errors'

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  gestor: 'Gestor',
}

const roleBadge: Record<string, { bg: string; color: string }> = {
  admin: { bg: '#FAF3E0', color: '#8E7118' },
  gestor: { bg: '#EFF3F0', color: '#3E7C4F' },
}

type EditingState = { mode: 'create' } | { mode: 'edit'; user: ManagedUser }

interface UserFormState {
  name: string
  email: string
  password: string
  role: 'admin' | 'gestor'
}

const emptyForm: UserFormState = {
  name: '',
  email: '',
  password: '',
  role: 'gestor',
}

export default function UsersSection() {
  const { user: currentUser } = useAuth()
  const { toast } = useToast()

  const [users, setUsers] = useState<ManagedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<EditingState>({ mode: 'create' })
  const [form, setForm] = useState<UserFormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [formError, setFormError] = useState('')

  const load = useCallback(() => {
    listUsers()
      .then(setUsers)
      .catch(() => {
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar a lista de usuários.',
          variant: 'destructive',
        })
      })
      .finally(() => setLoading(false))
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setEditing({ mode: 'create' })
    setForm(emptyForm)
    setFormError('')
    setModalOpen(true)
  }

  const openEdit = (u: ManagedUser) => {
    setEditing({ mode: 'edit', user: u })
    setForm({
      name: u.name || '',
      email: u.email,
      password: '',
      role: (u.role as 'admin' | 'gestor') || 'gestor',
    })
    setFormError('')
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (editing.mode === 'create' && form.password.length < 8) {
      setFormError('A senha temporária deve ter pelo menos 8 caracteres.')
      return
    }

    setSaving(true)
    try {
      if (editing.mode === 'create') {
        await createUser({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
        })
        toast({
          title: 'Usuário criado',
          description: `${form.name || form.email} agora tem acesso com o perfil ${roleLabels[form.role]}.`,
        })
      } else {
        const patch: { name?: string; role?: 'admin' | 'gestor'; password?: string } = {
          name: form.name,
          role: form.role,
        }
        if (form.password.length >= 8) {
          patch.password = form.password
        }
        await updateUser(editing.user.id, patch)
        toast({
          title: 'Usuário atualizado',
          description: 'As alterações foram salvas.',
        })
      }
      setModalOpen(false)
      load()
    } catch (err) {
      setFormError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleToggleStatus = async (u: ManagedUser) => {
    const isSelf = u.id === currentUser?.id
    const nextStatus = u.status === 'inativo' ? 'ativo' : 'inativo'
    if (isSelf && nextStatus === 'inativo') return

    setTogglingId(u.id)
    try {
      await setUserStatus(u.id, nextStatus)
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, status: nextStatus } : x)))
      toast({
        title: nextStatus === 'ativo' ? 'Usuário ativado' : 'Usuário desativado',
        description:
          nextStatus === 'ativo'
            ? `${u.name || u.email} pode acessar a plataforma novamente.`
            : `${u.name || u.email} não conseguirá mais entrar. Os dados foram preservados.`,
      })
    } catch (err) {
      toast({
        title: 'Erro',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setTogglingId(null)
    }
  }

  const canManageSelf = (u: ManagedUser) => u.id !== currentUser?.id

  return (
    <section className="gem-card p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="font-serif text-lg font-bold text-[#1E3A2F] flex items-center gap-2">
            <UserCog className="h-5 w-5 text-[#C9A227]" />
            Gerenciamento de usuários
          </h3>
          <p className="text-xs text-[#6B7A70] mt-1">
            Controle quem acessa a plataforma e com quais permissões.
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-[#C9A227] hover:bg-[#A8861D] text-white font-semibold text-xs sm:text-sm h-10 px-4 flex items-center gap-1.5 shadow"
        >
          <UserPlus className="h-4 w-4" />
          Adicionar usuário
        </Button>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#C9A227] border-t-transparent" />
            <p className="text-xs text-[#6B7A70]">Carregando usuários...</p>
          </div>
        </div>
      ) : users.length === 0 ? (
        <div className="border border-dashed border-[#E8E4DA] rounded-xl p-8 text-center">
          <UserPlus className="h-8 w-8 text-[#C9A227] mx-auto opacity-50 mb-2" />
          <p className="text-sm text-[#6B7A70]">Nenhum usuário cadastrado além de você.</p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-5 sm:-mx-6 px-5 sm:px-6">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#FAF8F3] border-b border-[#E8E4DA] text-[#6B7A70] uppercase font-semibold text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Nome</th>
                <th className="py-3 px-3">E-mail</th>
                <th className="py-3 px-3 text-center">Perfil</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E4DA]">
              {users.map((u) => {
                const isSelf = u.id === currentUser?.id
                const active = u.status !== 'inativo'
                const rBadge = roleBadge[u.role] || roleBadge.gestor
                return (
                  <tr key={u.id} className="hover:bg-[#FAF8F3] transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-[#1E3A2F]">{u.name || '—'}</p>
                      {isSelf && (
                        <span className="text-[10px] text-[#8E7118] font-medium">você</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-[#1F2A24]">{u.email}</td>
                    <td className="py-3.5 px-3 text-center">
                      <span
                        style={{ backgroundColor: rBadge.bg, color: rBadge.color }}
                        className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border border-current/20"
                      >
                        {roleLabels[u.role] || 'Gestor'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          active ? 'bg-[#EFF3F0] text-[#3E7C4F]' : 'bg-[#F7EBEA] text-[#B3452F]'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            active ? 'bg-[#3E7C4F]' : 'bg-[#B3452F]'
                          }`}
                        />
                        {active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEdit(u)}
                          title="Editar usuário"
                          className="rounded p-1.5 text-[#6B7A70] hover:bg-[#FAF3E0] hover:text-[#8E7118] transition"
                        >
                          <UserCog className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(u)}
                          disabled={togglingId === u.id || (isSelf && active)}
                          title={
                            isSelf && active
                              ? 'Você não pode desativar a sua própria conta'
                              : active
                                ? 'Desativar usuário'
                                : 'Ativar usuário'
                          }
                          className={`rounded p-1.5 transition disabled:opacity-30 disabled:cursor-not-allowed ${
                            active
                              ? 'text-[#6B7A70] hover:bg-[#F7EBEA] hover:text-[#B3452F]'
                              : 'text-[#3E7C4F] hover:bg-[#EFF3F0]'
                          }`}
                        >
                          {togglingId === u.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : active ? (
                            <ShieldOff className="h-4 w-4" />
                          ) : (
                            <ShieldCheck className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de criação/edição */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[440px] bg-white border-[#E8E4DA]">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-[#1E3A2F]">
              {editing.mode === 'create' ? 'Adicionar usuário' : 'Editar usuário'}
            </DialogTitle>
            <DialogDescription className="text-[#6B7A70] text-xs">
              {editing.mode === 'create'
                ? 'Crie o acesso com uma senha temporária e defina o perfil de permissões.'
                : 'Ajuste o nome, o perfil de acesso e, se quiser, defina uma nova senha.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div>
              <Label htmlFor="user-name" className="text-xs font-semibold text-[#1E3A2F]">
                Nome
              </Label>
              <Input
                id="user-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Nome completo"
                className="mt-1 border-[#E8E4DA] focus-visible:ring-[#C9A227]"
                required
              />
            </div>

            <div>
              <Label htmlFor="user-email" className="text-xs font-semibold text-[#1E3A2F]">
                E-mail
              </Label>
              <Input
                id="user-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="usuario@exemplo.com"
                className="mt-1 border-[#E8E4DA] focus-visible:ring-[#C9A227]"
                disabled={editing.mode === 'edit'}
                required
              />
              {editing.mode === 'edit' && (
                <p className="text-[11px] text-[#8EA598] mt-1">
                  O e-mail de acesso não pode ser alterado aqui.
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="user-password" className="text-xs font-semibold text-[#1E3A2F]">
                {editing.mode === 'create' ? 'Senha temporária' : 'Nova senha (opcional)'}
              </Label>
              <Input
                id="user-password"
                type="text"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Mínimo de 8 caracteres"
                className="mt-1 border-[#E8E4DA] focus-visible:ring-[#C9A227]"
                required={editing.mode === 'create'}
                minLength={editing.mode === 'create' ? 8 : undefined}
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-[#1E3A2F]">Perfil de acesso</Label>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {(['admin', 'gestor'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, role: r }))}
                    className={`rounded-lg border px-3 py-2.5 text-left transition ${
                      form.role === r
                        ? 'border-[#C9A227] bg-[#FAF3E0] shadow-sm'
                        : 'border-[#E8E4DA] bg-white hover:border-[#C9A227]/50'
                    }`}
                  >
                    <span className="block text-xs font-bold text-[#1E3A2F]">{roleLabels[r]}</span>
                    <span className="block text-[10px] text-[#6B7A70] mt-0.5">
                      {r === 'admin' ? 'Acesso total' : 'Vendas e consulta'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {formError && <p className="text-xs text-[#B3452F]">{formError}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="border-[#E8E4DA] text-[#6B7A70]"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-[#C9A227] hover:bg-[#A8861D] text-white font-medium"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : editing.mode === 'create' ? (
                  'Criar usuário'
                ) : (
                  'Salvar'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  )
}
