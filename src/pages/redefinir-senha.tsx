import React, { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Sparkles, KeyRound } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'

export default function RedefinirSenha() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const navigate = useNavigate()
  const { toast } = useToast()

  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!token) {
      setError('Token de redefinição não encontrado ou expirado.')
      return
    }

    if (password !== passwordConfirm) {
      setError('As senhas digitadas não coincidem.')
      return
    }

    if (password.length < 8) {
      setError('A nova senha deve ter no mínimo 8 caracteres.')
      return
    }

    setLoading(true)

    try {
      await pb.collection('users').confirmPasswordReset(token, password, passwordConfirm)
      toast({
        title: 'Senha redefinida com sucesso!',
        description: 'Faça login com a sua nova senha.',
      })
      navigate('/entrar')
    } catch (err: unknown) {
      const pbErr = err as { message?: string }
      setError(pbErr.message || 'Falha ao redefinir senha. O link pode ter expirado.')
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
            <h1 className="font-serif text-2xl font-bold text-[#1E3A2F]">Nova Senha</h1>
            <p className="text-xs text-[#6B7A70]">Digite e confirme sua nova senha</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-[#B3452F]/30 bg-[#F7EBEA] p-3 text-xs text-[#B3452F]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#1E3A2F] mb-1">
              Nova Senha (mínimo 8 caracteres)
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="h-10 border-[#E8E4DA] focus-visible:ring-[#C9A227]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E3A2F] mb-1">
              Confirmar Nova Senha
            </label>
            <Input
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="••••••••"
              required
              className="h-10 border-[#E8E4DA] focus-visible:ring-[#C9A227]"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-[#1E3A2F] hover:bg-[#2A5040] text-white font-semibold flex items-center justify-center gap-2 transition shadow"
          >
            {loading ? (
              'Redefinindo...'
            ) : (
              <>
                <KeyRound className="h-4 w-4 text-[#C9A227]" />
                <span>Salvar Nova Senha</span>
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#E8E4DA] text-center">
          <Link to="/entrar" className="text-xs font-medium text-[#6B7A70] hover:text-[#1E3A2F]">
            Voltar para o login
          </Link>
        </div>
      </div>
    </div>
  )
}
