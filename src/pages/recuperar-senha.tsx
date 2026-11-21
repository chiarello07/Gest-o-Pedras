import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, ArrowLeft, MailCheck } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function RecuperarSenha() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await pb.collection('users').requestPasswordReset(email)
      setSent(true)
    } catch (err: unknown) {
      const pbErr = err as { message?: string }
      setError(pbErr.message || 'Erro ao solicitar redefinição. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-[#FAF8F3] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white border border-[#E8E4DA] rounded-2xl p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1E3A2F] text-[#C9A227]">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold text-[#1E3A2F]">Recuperar Senha</h1>
            <p className="text-xs text-[#6B7A70]">Redefina o acesso à sua conta</p>
          </div>
        </div>

        {sent ? (
          <div className="text-center py-4 space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#3E7C4F]/15 text-[#3E7C4F]">
              <MailCheck className="h-7 w-7" />
            </div>
            <h3 className="font-serif text-lg font-bold text-[#1E3A2F]">
              E-mail Enviado com Sucesso
            </h3>
            <p className="text-xs text-[#6B7A70] leading-relaxed">
              Enviamos um link de redefinição para <strong>{email}</strong>. Verifique sua caixa de
              entrada e siga as instruções.
            </p>
            <div className="pt-2">
              <Link to="/entrar">
                <Button className="w-full bg-[#1E3A2F] hover:bg-[#2A5040] text-white">
                  Voltar para o Login
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl border border-[#B3452F]/30 bg-[#F7EBEA] p-3 text-xs text-[#B3452F]">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#1E3A2F] mb-1">
                E-mail Cadastrado
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                required
                className="h-10 border-[#E8E4DA] focus-visible:ring-[#C9A227]"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[#1E3A2F] hover:bg-[#2A5040] text-white font-semibold transition shadow"
            >
              {loading ? 'Enviando...' : 'Enviar Link de Redefinição'}
            </Button>

            <div className="text-center pt-2">
              <Link
                to="/entrar"
                className="inline-flex items-center gap-1.5 text-xs text-[#6B7A70] hover:text-[#1E3A2F]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Voltar ao login</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
