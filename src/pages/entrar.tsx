import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Sparkles, ArrowRight, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'

export default function Entrar() {
  const { login, isValid } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [email, setEmail] = useState('christianochiarello@gmail.com')
  const [password, setPassword] = useState('Skip@Pass')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({})

  React.useEffect(() => {
    if (isValid) {
      navigate('/', { replace: true })
    }
  }, [isValid, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setLoading(true)

    try {
      await login(email, password)
      toast({
        title: 'Bem-vindo ao atelier!',
        description: 'Sessão iniciada com sucesso.',
      })
      navigate('/')
    } catch (err: unknown) {
      const pbErr = err as {
        data?: { data?: Record<string, { message: string }> }
        message?: string
      }
      if (pbErr.data?.data) {
        const fieldErrors: { email?: string; password?: string } = {}
        if (pbErr.data.data.identity || pbErr.data.data.email) {
          fieldErrors.email = pbErr.data.data.identity?.message || pbErr.data.data.email?.message
        }
        if (pbErr.data.data.password) {
          fieldErrors.password = pbErr.data.data.password.message
        }
        setErrors(fieldErrors)
      } else {
        setErrors({ general: 'E-mail ou senha incorretos. Verifique suas credenciais.' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-[#FAF8F3]">
      {/* Left panel: deep green with stone essence */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-[#1E3A2F] p-12 text-[#FAF8F3] relative overflow-hidden">
        {/* Decorative crystal geometric patterns */}
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#C9A227]/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 h-80 w-80 rounded-full bg-[#3E7C4F]/20 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#C9A227] to-[#997716] shadow-lg text-white">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <span className="font-serif text-2xl font-bold tracking-wide">Pedras & Cristais</span>
              <p className="text-xs uppercase tracking-widest text-[#C9A227] font-semibold">
                Gestão & Estoque de Gemas
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 max-w-md space-y-6">
          <h1 className="font-serif text-4xl font-bold leading-tight text-[#FAF8F3]">
            A elegância das pedras naturais, o controle absoluto do seu atelier.
          </h1>
          <p className="text-sm leading-relaxed text-[#C7D4CD]">
            Acompanhe o estoque de ametistas, quartzos, geodos e joias finas com margem em tempo
            real, encantamento promocional e fluxo financeiro integrado.
          </p>

          <div className="pt-4 flex items-center gap-4 text-xs text-[#E8D08D]">
            <div className="flex items-center gap-1.5 bg-[#162B23] px-3 py-1.5 rounded-full border border-[#C9A227]/30">
              <ShieldCheck className="h-4 w-4 text-[#C9A227]" />
              <span>Acesso restrito e seguro</span>
            </div>
            <div className="flex items-center gap-1.5 bg-[#162B23] px-3 py-1.5 rounded-full border border-[#C9A227]/30">
              <Sparkles className="h-4 w-4 text-[#C9A227]" />
              <span>Sincronização em tempo real</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-[#8EA598]">
          © {new Date().getFullYear()} Gestão Pedras & Cristais. Todos os direitos reservados.
        </div>
      </div>

      {/* Right panel: Login form */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 max-w-xl mx-auto w-full">
        <div className="mb-8">
          <div className="lg:hidden flex items-center gap-2 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1E3A2F] text-[#C9A227]">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="font-serif text-xl font-bold text-[#1E3A2F]">Pedras & Cristais</span>
          </div>
          <h2 className="font-serif text-3xl font-bold text-[#1E3A2F]">Entrar no Atelier</h2>
          <p className="text-sm text-[#6B7A70] mt-1">
            Digite seu e-mail e senha para acessar o painel de gestão.
          </p>
        </div>

        {errors.general && (
          <div className="mb-5 rounded-xl border border-[#B3452F]/30 bg-[#F7EBEA] p-3 text-xs text-[#B3452F]">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#1E3A2F] mb-1.5">E-mail</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu.email@exemplo.com"
              required
              className="h-11 border-[#E8E4DA] bg-white focus-visible:ring-[#C9A227]"
            />
            {errors.email && <p className="text-xs text-[#B3452F] mt-1">{errors.email}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-[#1E3A2F]">Senha</label>
              <Link
                to="/recuperar-senha"
                className="text-xs font-medium text-[#C9A227] hover:underline"
              >
                Esqueci minha senha
              </Link>
            </div>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="h-11 border-[#E8E4DA] bg-white focus-visible:ring-[#C9A227]"
            />
            {errors.password && <p className="text-xs text-[#B3452F] mt-1">{errors.password}</p>}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-[#1E3A2F] hover:bg-[#2A5040] text-white font-semibold flex items-center justify-center gap-2 mt-2 transition shadow-md"
          >
            {loading ? (
              'Acessando...'
            ) : (
              <>
                <span>Entrar no Sistema</span>
                <ArrowRight className="h-4 w-4 text-[#C9A227]" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-[#E8E4DA] text-center">
          <p className="text-xs text-[#6B7A70]">
            Não possui uma conta?{' '}
            <Link to="/criar-conta" className="font-semibold text-[#C9A227] hover:underline">
              Criar conta de acesso
            </Link>
          </p>
          <div className="mt-4 p-3 bg-[#FAF8F3] border border-[#E8E4DA] rounded-lg text-left text-[11px] text-[#6B7A70]">
            <p className="font-semibold text-[#1E3A2F] mb-0.5">
              Credenciais de teste pré-configuradas:
            </p>
            <p>
              E-mail:{' '}
              <code className="text-[#1E3A2F] font-mono">christianochiarello@gmail.com</code>
            </p>
            <p>
              Senha: <code className="text-[#1E3A2F] font-mono">Skip@Pass</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
