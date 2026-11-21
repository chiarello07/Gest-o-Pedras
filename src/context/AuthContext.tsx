import React, { createContext, useContext, useEffect, useState } from 'react'
import type { AuthModel } from 'pocketbase'
import pb from '@/lib/pocketbase/client'

export type UserRole = 'admin' | 'gestor'

interface AuthContextType {
  user: AuthModel | null
  token: string | null
  isValid: boolean
  isLoading: boolean
  /** Perfil de acesso do usuário logado ('admin' quando não definido). */
  role: UserRole
  /** false quando o usuário está desativado no banco (bloqueado no login). */
  isActive: boolean
  login: (email: string, pass: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const normalizeRole = (u: AuthModel | null): UserRole =>
  u && (u as { role?: string }).role === 'gestor' ? 'gestor' : 'admin'

const isActiveUser = (u: AuthModel | null): boolean =>
  !u || (u as { status?: string }).status !== 'inativo'

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<UserRole>(normalizeRole(pb.authStore.record))
  const [isActive, setIsActive] = useState<boolean>(isActiveUser(pb.authStore.record))
  const [user, setUser] = useState<AuthModel | null>(pb.authStore.record)
  const [token, setToken] = useState<string | null>(pb.authStore.token)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Escuta mudanças de authStore
    const unsub = pb.authStore.onChange((newToken, newModel) => {
      setToken(newToken)
      setUser(newModel)
      setRole(normalizeRole(newModel))
      setIsActive(isActiveUser(newModel))
    })

    // Valida sessão inicial
    if (pb.authStore.isValid) {
      pb.collection('users')
        .authRefresh()
        .then((res) => {
          setUser(res.record)
          setToken(res.token)
          setRole(normalizeRole(res.record))
          setIsActive(isActiveUser(res.record))
        })
        .catch(() => {
          pb.authStore.clear()
          setUser(null)
          setToken(null)
        })
        .finally(() => {
          setIsLoading(false)
        })
    } else {
      setIsLoading(false)
    }

    return () => {
      unsub()
    }
  }, [])

  const login = async (email: string, pass: string) => {
    const res = await pb.collection('users').authWithPassword(email, pass)
    setUser(res.record)
    setToken(res.token)
    setRole(normalizeRole(res.record))
    setIsActive(isActiveUser(res.record))
  }

  const logout = () => {
    pb.authStore.clear()
    setUser(null)
    setToken(null)
    setRole('admin')
    setIsActive(true)
  }

  const refreshUser = async () => {
    if (pb.authStore.isValid) {
      try {
        const res = await pb.collection('users').authRefresh()
        setUser(res.record)
        setToken(res.token)
        setRole(normalizeRole(res.record))
        setIsActive(isActiveUser(res.record))
      } catch (_) {
        // ignora
      }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isValid: !!pb.authStore.isValid && !!user,
        isLoading,
        role,
        isActive,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return ctx
}
