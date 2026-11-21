import pb from '@/lib/pocketbase/client'

export type UserStatus = 'ativo' | 'inativo'

export interface ManagedUser {
  id: string
  name: string
  email: string
  role: string
  status: string
  verified: boolean
  created: string
}

export interface CreateUserInput {
  name: string
  email: string
  password: string
  role: 'admin' | 'gestor'
}

export interface UpdateUserInput {
  name?: string
  role?: 'admin' | 'gestor'
  status?: UserStatus
  password?: string
}

/** Lista todos os usuários cadastrados (apenas admin, via regra da coleção). */
export async function listUsers(): Promise<ManagedUser[]> {
  return pb.collection('users').getFullList<ManagedUser>({ sort: '-created' })
}

/** Cria um usuário com senha temporária e perfil de acesso. */
export async function createUser(input: CreateUserInput): Promise<ManagedUser> {
  return pb.collection('users').create<ManagedUser>({
    name: input.name,
    email: input.email,
    password: input.password,
    passwordConfirm: input.password,
    role: input.role,
    status: 'ativo',
  })
}

/** Edita nome, perfil e/ou senha de um usuário. */
export async function updateUser(id: string, input: UpdateUserInput): Promise<ManagedUser> {
  return pb.collection('users').update<ManagedUser>(id, input)
}

/** Ativa ou desativa um usuário sem apagar seus dados. */
export async function setUserStatus(id: string, status: UserStatus): Promise<ManagedUser> {
  return pb.collection('users').update<ManagedUser>(id, { status })
}
