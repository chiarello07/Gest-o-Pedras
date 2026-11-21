import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Sparkles, ArrowRight, UserPlus } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'

export default function CriarConta() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    if (password !== passwordConfirm) {
      setErrors({ passwordConfirm: 'As senhas não coincidem.' })
      return
    }

    if (password.length < 8) {
      setErrors({ password: 'A senha deve ter pelo menos 8 caracteres.' })
      return
    }

    setLoading(true)

    try {
      await pb.collection('users').create({
        name,
        email,
        password,
        passwordConfirm,
      })

      // Envia solicitação de verificação por e-mail
      try {
        await pb.collection('users').requestVerification(email)
      } catch (_) {
        // Ignora caso envio falhe silenciosamente
      }

      toast({
        title: 'Conta criada com sucesso!',
        description: 'Enviamos uma confirmação para seu e-mail. Faça login para acessar.',
      })
      navigate('/entrar')
    } catch (err: unknown) {
      const pbErr = err as {
        data?: { data?: Record<string, { message: string }> }
        message?: string
      }
      if (pbErr.data?.data) {
        const fieldErrors: Record<string, string> = {}
        for (const [key, value] of Object.entries(pbErr.data.data)) {
          fieldErrors[key] = value.message
        }
        setErrors(fieldErrors)
      } else {
        setErrors({ general: pbErr.message || 'Erro ao criar conta. Tente novamente.' })
      }
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
            <h1 className="font-serif text-2xl font-bold text-[#1E3A2F]">Criar Conta</h1>
            <p className="text-xs text-[#6B7A70]">Junte-se à gestão do atelier</p>
          </div>
        </div>

        {errors.general && (
          <div className="mb-4 rounded-xl border border-[#B3452F]/30 bg-[#F7EBEA] p-3 text-xs text-[#B3452F]">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#1E3A2F] mb-1">Nome Completo</label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Christian Chiarello"
              required
              className="h-10 border-[#E8E4DA] focus-visible:ring-[#C9A227]"
            />
            {errors.name && <p className="text-xs text-[#B3452F] mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E3A2F] mb-1">E-mail</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              className="h-10 border-[#E8E4DA] focus-visible:ring-[#C9A227]"
            />
            {errors.email && <p className="text-xs text-[#B3452F] mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E3A2F] mb-1">
              Senha (mínimo 8 caracteres)
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="h-10 border-[#E8E4DA] focus-visible:ring-[#C9A227]"
            />
            {errors.password && <p className="text-xs text-[#B3452F] mt-1">{errors.password}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E3A2F] mb-1">
              Confirmar Senha
            </label>
            <Input
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="••••••••"
              required
              className="h-10 border-[#E8E4DA] focus-visible:ring-[#C9A227]"
            />
            {errors.passwordConfirm && (
              <p className="text-xs text-[#B3452F] mt-1">{errors.passwordConfirm}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-[#1E3A2F] hover:bg-[#2A5040] text-white font-semibold flex items-center justify-center gap-2 mt-2 transition shadow"
          >
            {loading ? (
              'Criando...'
            ) : (
              <>
                <UserPlus className="h-4 w-4 text-[#C9A227]" />
                <span>Registrar Conta</span>
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#E8E4DA] text-center">
          <p className="text-xs text-[#6B7A70]">
            Já possui acesso?{' '}
            <Link to="/entrar" className="font-semibold text-[#C9A227] hover:underline">
              Fazer login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
