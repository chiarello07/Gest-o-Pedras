import React, { useEffect, useState } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Gem,
  ShoppingBag,
  CircleDollarSign,
  Settings,
  LogOut,
  Menu,
  X,
  Sparkles,
  Mail,
  User as UserIcon,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import type { AuthModel } from 'pocketbase'
import { getStoreSettings, type StoreSettings } from '@/services/settings'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface NavItem {
  to: string
  label: string
  icon: React.ElementType
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/produtos', label: 'Produtos', icon: Gem },
  { to: '/vendas', label: 'Vendas', icon: ShoppingBag },
  { to: '/financeiro', label: 'Financeiro', icon: CircleDollarSign },
  { to: '/configuracoes', label: 'Configurações', icon: Settings, adminOnly: true },
]

const routeTitles: Record<string, string> = {
  '/': 'Dashboard de Operações',
  '/produtos': 'Gestão de Estoque',
  '/vendas': 'Registro de Vendas',
  '/financeiro': 'Controle Financeiro',
  '/configuracoes': 'Configurações do Atelier',
}

export default function Layout() {
  const { user, logout, isValid, isLoading, role } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [mobileOpen, setMobileOpen] = useState(false)
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [storePrefs, setStorePrefs] = useState<{ storeName: string; logoUrl: string }>({
    storeName: '',
    logoUrl: '',
  })

  // Preferências da loja (nome + logo exibidos na marca do menu lateral)
  useEffect(() => {
    let cancelled = false
    getStoreSettings()
      .then((prefs) => {
        if (!cancelled) setStorePrefs(prefs)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  // Gestor não acessa a tela de Configurações: redireciona para o dashboard
  useEffect(() => {
    if (isLoading || !isValid) return
    if (role !== 'admin' && location.pathname === '/configuracoes') {
      navigate('/', { replace: true })
    }
  }, [isLoading, isValid, role, location.pathname, navigate])

  const visibleNavItems = navItems.filter((item) => !item.adminOnly || role === 'admin')
  const brandName = storePrefs.storeName || 'Pedras & Cristais'
  const brandLogoUrl = storePrefs.logoUrl

  // Proteção de rota para páginas dentro do Layout
  React.useEffect(() => {
    if (!isLoading && !isValid) {
      navigate('/entrar', { replace: true })
    }
  }, [isLoading, isValid, navigate])

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#FAF8F3]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#C9A227] border-t-transparent" />
          <p className="text-sm font-medium text-[#6B7A70]">Carregando atelier...</p>
        </div>
      </div>
    )
  }

  if (!isValid) {
    return null
  }

  const currentDateFormatted = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())

  const formattedDateCapitalized =
    currentDateFormatted.charAt(0).toUpperCase() + currentDateFormatted.slice(1)

  const pageTitle = routeTitles[location.pathname] || 'Pedras & Cristais'

  const handleLogout = () => {
    logout()
    toast({
      title: 'Sessão encerrada',
      description: 'Até logo! Você foi desconectado com sucesso.',
    })
    navigate('/entrar', { replace: true })
  }

  const handleRequestEmailChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEmail || !newEmail.includes('@')) {
      setEmailError('Informe um e-mail válido.')
      return
    }
    setEmailLoading(true)
    setEmailError('')
    try {
      await pb.collection('users').requestEmailChange(newEmail)
      toast({
        title: 'Confirmação enviada',
        description: `Enviamos um link de confirmação para ${newEmail}.`,
      })
      setEmailModalOpen(false)
      setNewEmail('')
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message || 'Falha ao solicitar alteração de e-mail.'
      setEmailError(msg)
    } finally {
      setEmailLoading(false)
    }
  }

  const userName = user?.name || user?.email?.split('@')[0] || 'Usuário'
  const userInitials = userName
    .split(' ')
    .map((part: string) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between p-4">
      <div>
        {/* Brand Mark */}
        <div className="flex items-center gap-3 px-3 py-4 border-b border-[#2A5040]/60">
          {brandLogoUrl ? (
            <img
              src={brandLogoUrl}
              alt={brandName}
              className="h-10 w-10 shrink-0 rounded-xl object-contain bg-[#FAF8F3]/95 p-1 shadow-md shadow-black/20"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#C9A227] to-[#8E7118] shadow-md shadow-black/20 text-white">
              <Sparkles className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="font-serif text-lg font-bold tracking-wide text-[#FAF8F3] truncate">
              {brandName}
            </h1>
            <p className="text-[11px] uppercase tracking-wider text-[#C9A227] font-semibold">
              Gestão de Atelier
            </p>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="mt-6 flex flex-col gap-1.5">
          {visibleNavItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.to
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={`group relative flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-[#2A5040] text-[#FAF8F3] font-semibold shadow-sm'
                    : 'text-[#C7D4CD] hover:bg-[#254638] hover:text-white'
                }`}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-[#C9A227]" />
                )}
                <Icon
                  className={`h-4 w-4 transition-colors ${
                    isActive ? 'text-[#C9A227]' : 'text-[#8EA598] group-hover:text-white'
                  }`}
                />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>
      </div>

      {/* User profile bottom block */}
      <div className="border-t border-[#2A5040]/60 pt-4">
        {user?.verified === false && (
          <div className="mb-3 rounded-lg bg-[#C9A227]/15 p-2.5 text-xs text-[#E8D08D]">
            <p className="font-medium">E-mail não verificado.</p>
            <button
              onClick={() => {
                if (user?.email) {
                  pb.collection('users')
                    .requestVerification(user.email)
                    .then(() => {
                      toast({
                        title: 'E-mail enviado',
                        description: 'Verifique sua caixa de entrada.',
                      })
                    })
                    .catch(() => {
                      toast({
                        title: 'Erro',
                        description: 'Não foi possível reenviar a verificação.',
                        variant: 'destructive',
                      })
                    })
                }
              }}
              className="mt-1 font-semibold text-[#FAF8F3] underline hover:text-[#C9A227]"
            >
              Reenviar confirmação
            </button>
          </div>
        )}

        <div className="flex items-center justify-between rounded-xl bg-[#162B23] p-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2A5040] text-xs font-bold text-[#C9A227] border border-[#C9A227]/30">
              {userInitials || <UserIcon className="h-4 w-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-[#FAF8F3]">{userName}</p>
              <p className="truncate text-[11px] text-[#8EA598]">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setEmailModalOpen(true)}
              title="Alterar e-mail"
              className="rounded p-1.5 text-[#8EA598] hover:bg-[#2A5040] hover:text-[#C9A227] transition"
            >
              <Mail className="h-4 w-4" />
            </button>
            <button
              onClick={handleLogout}
              title="Encerrar sessão"
              className="rounded p-1.5 text-[#8EA598] hover:bg-[#B3452F]/20 hover:text-[#E87A65] transition"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#FAF8F3] text-[#1F2A24] flex">
      {/* Desktop Sidebar (fixed 260px) */}
      <aside className="hidden lg:flex w-[260px] flex-col fixed inset-y-0 left-0 z-30 bg-[#1E3A2F] border-r border-[#162B23] shadow-lg">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative flex w-[280px] max-w-[85vw] flex-col bg-[#1E3A2F] shadow-2xl transition-transform duration-200">
            <div className="absolute right-3 top-3">
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-2 text-[#8EA598] hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col lg:pl-[260px]">
        {/* Top Header */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#E8E4DA] bg-[#FAF8F3]/90 px-4 sm:px-6 md:px-8 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden rounded-lg p-2 text-[#1E3A2F] hover:bg-[#E8E4DA]"
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#1E3A2F]">{pageTitle}</h2>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-[#6B7A70]">
            <span>{formattedDateCapitalized}</span>
          </div>
        </header>

        {/* Dynamic page content */}
        <main className="flex-1 px-4 py-6 sm:px-6 md:px-8 max-w-[1280px] w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Dialog para alterar email */}
      <Dialog open={emailModalOpen} onOpenChange={setEmailModalOpen}>
        <DialogContent className="sm:max-w-[420px] bg-white border-[#E8E4DA]">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-[#1E3A2F]">
              Alterar E-mail de Acesso
            </DialogTitle>
            <DialogDescription className="text-[#6B7A70] text-xs">
              Será enviado um e-mail de confirmação para o novo endereço informado.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRequestEmailChange} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-[#1E3A2F] block mb-1">Novo E-mail</label>
              <Input
                type="email"
                placeholder="novo.email@exemplo.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
                className="border-[#E8E4DA] focus-visible:ring-[#C9A227]"
              />
              {emailError && <p className="text-xs text-[#B3452F] mt-1">{emailError}</p>}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEmailModalOpen(false)}
                className="border-[#E8E4DA] text-[#6B7A70]"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={emailLoading}
                className="bg-[#C9A227] hover:bg-[#A8861D] text-white font-medium"
              >
                {emailLoading ? 'Enviando...' : 'Enviar confirmação'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
