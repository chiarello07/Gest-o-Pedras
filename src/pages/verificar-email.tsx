import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Sparkles, CheckCircle2, XCircle } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'

export default function VerificarEmail() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!token) {
      setLoading(false)
      setErrorMsg('Token de verificação ausente ou link incompleto.')
      return
    }

    pb.collection('users')
      .confirmVerification(token)
      .then(() => {
        setSuccess(true)
      })
      .catch((err) => {
        setErrorMsg(err?.message || 'Link inválido ou expirado.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [token])

  return (
    <div className="flex min-h-screen bg-[#FAF8F3] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white border border-[#E8E4DA] rounded-2xl p-8 shadow-xl text-center">
        <div className="flex justify-center mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1E3A2F] text-[#C9A227]">
            <Sparkles className="h-6 w-6" />
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 py-6">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-[#C9A227] border-t-transparent" />
            <p className="text-sm text-[#6B7A70]">Verificando seu e-mail...</p>
          </div>
        ) : success ? (
          <div className="space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#3E7C4F]/15 text-[#3E7C4F]">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-[#1E3A2F]">E-mail Verificado!</h1>
            <p className="text-xs text-[#6B7A70] leading-relaxed">
              Sua conta foi autenticada com sucesso. Agora você tem acesso completo ao atelier.
            </p>
            <div className="pt-2">
              <Link to="/entrar">
                <Button className="w-full bg-[#1E3A2F] hover:bg-[#2A5040] text-white">
                  Acessar Painel
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#B3452F]/15 text-[#B3452F]">
              <XCircle className="h-8 w-8" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-[#1E3A2F]">Falha na Verificação</h1>
            <p className="text-xs text-[#6B7A70] leading-relaxed">
              {errorMsg ||
                'Não foi possível confirmar o seu e-mail. Solicite uma nova verificação na sua conta.'}
            </p>
            <div className="pt-2">
              <Link to="/entrar">
                <Button className="w-full bg-[#1E3A2F] hover:bg-[#2A5040] text-white">
                  Ir para Login
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
