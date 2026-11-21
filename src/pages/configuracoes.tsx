import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Settings, Sparkles, ShieldCheck, ShieldAlert } from 'lucide-react'
import UsersSection from '@/components/UsersSection'
import PreferencesSection, { type StorePreferences } from '@/components/PreferencesSection'
import { useAuth } from '@/context/AuthContext'

const profilesInfo = [
  {
    icon: ShieldCheck,
    title: 'Admin',
    color: 'text-[#8E7118]',
    bg: 'bg-[#FAF3E0]',
    border: 'border-[#C9A227]/30',
    permissions: [
      'Acesso total a todas as telas',
      'Cadastrar e editar produtos',
      'Ver divisão de lucros entre sócios e aportes',
      'Gerenciar usuários e preferências da plataforma',
    ],
  },
  {
    icon: ShieldAlert,
    title: 'Gestor',
    color: 'text-[#3E7C4F]',
    bg: 'bg-[#EFF3F0]',
    border: 'border-[#3E7C4F]/20',
    permissions: [
      'Registrar vendas e consultar estoque',
      'Visualizar caixa do dia e movimentações',
      'Sem acesso à divisão de lucros e aportes',
      'Sem acesso a Configurações',
    ],
  },
] as const

export default function Configuracoes() {
  const { role } = useAuth()
  const [storePrefs, setStorePrefs] = useState<StorePreferences | null>(null)

  // Gestor não acessa Configurações — redireciona para o Dashboard
  if (role && role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return (
    <div className="space-y-6 animate-crystalline pb-12">
      {/* Cabeçalho */}
      <div className="gem-card p-5 sm:p-6 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-[#1E3A2F]/10 blur-2xl pointer-events-none" />
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#1E3A2F] text-[#C9A227] shadow-md">
            <Settings className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#1E3A2F]">
              Configurações do Atelier
            </h2>
            <p className="text-xs sm:text-sm text-[#6B7A70] mt-0.5">
              Usuários, perfis de acesso e preferências da plataforma.
            </p>
          </div>
        </div>
      </div>

      <UsersSection />

      <PreferencesSection onChange={setStorePrefs} />

      {/* Perfis de acesso — referência */}
      <section className="gem-card p-5 sm:p-6">
        <div className="mb-5">
          <h3 className="font-serif text-lg font-bold text-[#1E3A2F] flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#C9A227]" />
            Perfis de acesso
          </h3>
          <p className="text-xs text-[#6B7A70] mt-1">
            Referência do que cada perfil pode fazer na plataforma
            {storePrefs?.storeName
              ? ` (atualmente você é ${role === 'admin' ? 'Admin' : 'Gestor'})`
              : ''}
            .
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {profilesInfo.map((p) => {
            const Icon = p.icon
            return (
              <div key={p.title} className={`rounded-xl border ${p.border} ${p.bg} p-4`}>
                <div className="flex items-center gap-2 mb-2.5">
                  <Icon className={`h-4.5 w-4.5 ${p.color}`} />
                  <span className={`font-serif font-bold text-sm ${p.color}`}>{p.title}</span>
                </div>
                <ul className="space-y-1.5">
                  {p.permissions.map((perm) => (
                    <li
                      key={perm}
                      className="flex items-start gap-1.5 text-[11px] sm:text-xs text-[#1F2A24]"
                    >
                      <span
                        className={`mt-1.5 h-1 w-1 rounded-full shrink-0 ${p.color.replace('text-', 'bg-')}`}
                      />
                      {perm}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
