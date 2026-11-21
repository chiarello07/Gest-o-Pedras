import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'

export default function ConfirmarEmail() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const { logout } = useAuth()

  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) {
      setErrorMsg('Token de confirmação ausente ou inválido.')
      return
    }
    setSubmitting(true)
    setErrorMsg('')
    try {
      await pb.collection('users').confirmEmailChange(token, password)
      logout()
      setSuccess(true)
    } catch (err: unknown) {
      const pbErr = err as { message?: string }
      setErrorMsg(pbErr.message || 'Senha incorreta ou link de confirmação expirado.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-[#FAF8F3] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white border border-[#E8E4DA] rounded-2xl p-8 shadow-xl text-center">
        <div className="flex justify-center mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1E3A2F] text-[#C9A227]">
            <Sparkles className="h-6 w-6" />
          </div>
        </div>

        {success ? (
          <div className="space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#3E7C4F]/15 text-[#3E7C4F]">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-[#1E3A2F]">
              E-mail Alterado com Sucesso!
            </h1>
            <p className="text-xs text-[#6B7A70] leading-relaxed">
              O novo endereço de e-mail foi confirmado. Por segurança, sua sessão foi encerrada.
              Acesse sua conta com o novo e-mail.
            </p>
            <div className="pt-2">
              <Link to="/entrar">
                <Button className="w-full bg-[#1E3A2F] hover:bg-[#2A5040] text-white">
                  Fazer Login
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleConfirm} className="space-y-4 text-left">
            <div>
              <h1 className="font-serif text-2xl font-bold text-[#1E3A2F] text-center">
                Confirmar Novo E-mail
              </h1>
              <p className="text-xs text-[#6B7A70] text-center mt-1">
                Para confirmar a alteração de endereço, digite sua senha de acesso atual.
              </p>
            </div>

            {errorMsg && (
              <div className="rounded-xl border border-[#B3452F]/30 bg-[#F7EBEA] p-3 text-xs text-[#B3452F]">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#1E3A2F] mb-1">
                Senha da Conta
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full h-10 rounded-md border border-[#E8E4DA] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-11 bg-[#1E3A2F] hover:bg-[#2A5040] text-white font-semibold"
            >
              {submitting ? 'Confirmando...' : 'Confirmar Novo E-mail'}
            </Button>

            <div className="text-center pt-2">
              <Link to="/entrar" className="text-xs text-[#6B7A70] hover:text-[#1E3A2F]">
                Voltar para o Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
