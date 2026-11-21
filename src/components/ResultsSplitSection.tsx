import { useEffect, useState } from 'react'
import { PieChart, Users, Landmark, HandCoins, Plus, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AnimatedCounter, formatCurrency } from '@/components/AnimatedCounter'
import { getReservaPercent, setReservaPercent } from '@/services/movements'

interface ResultsSplitSectionProps {
  /** Total vendido no período filtrado */
  totalVendido: number
  /** Custo dos produtos vendidos no período */
  custoVendido: number
  /** Rótulo do período selecionado (ex.: "Este mês") */
  periodo: string
}

interface Investidor {
  id: string
  nome: string
  valor: number
  /** Percentual informado pelo usuário (informacional, não travado) */
  percentual: number
}

const RESERVA_DEFAULT = 10

export default function ResultsSplitSection({
  totalVendido,
  custoVendido,
  periodo,
}: ResultsSplitSectionProps) {
  const [reservaPercent, setReservaPercentState] = useState<number>(RESERVA_DEFAULT)
  const [reservaInput, setReservaInput] = useState<string>(String(RESERVA_DEFAULT))
  const [savingReserva, setSavingReserva] = useState(false)
  const [reservaSavedAt, setReservaSavedAt] = useState<string>('')
  const [investidores, setInvestidores] = useState<Investidor[]>([])
  const [novoNome, setNovoNome] = useState('')
  const [novoValor, setNovoValor] = useState('')

  useEffect(() => {
    getReservaPercent().then((v) => {
      setReservaPercentState(v)
      setReservaInput(String(v))
    })
  }, [])

  const resultado = totalVendido - custoVendido
  const reserva = (resultado * reservaPercent) / 100
  const restante = resultado - reserva
  const socio = restante / 2

  const applyReserva = async () => {
    const v = Number(reservaInput)
    const valid = Number.isFinite(v) && v >= 0 && v <= 100
    if (!valid) {
      setReservaSavedAt('invalid')
      return
    }
    setSavingReserva(true)
    try {
      await setReservaPercent(v)
      setReservaPercentState(v)
      setReservaSavedAt('ok')
      setTimeout(() => setReservaSavedAt(''), 2500)
    } catch (_) {
      setReservaSavedAt('error')
      setTimeout(() => setReservaSavedAt(''), 3500)
    } finally {
      setSavingReserva(false)
    }
  }

  const addInvestidor = () => {
    const nome = novoNome.trim()
    const valor = Number(novoValor)
    if (!nome || !Number.isFinite(valor) || valor <= 0) return
    setInvestidores((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        nome,
        valor,
        percentual: resultado > 0 ? (valor / resultado) * 100 : 0,
      },
    ])
    setNovoNome('')
    setNovoValor('')
  }

  const removeInvestidor = (id: string) =>
    setInvestidores((prev) => prev.filter((i) => i.id !== id))

  return (
    <div className="gem-card p-5 sm:p-6">
      <div className="flex items-center gap-2.5 mb-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FAF3E0] text-[#C9A227]">
          <PieChart className="h-4.5 w-4.5" />
        </span>
        <div>
          <h3 className="font-serif text-lg font-bold text-[#1E3A2F]">Divisão de Resultados</h3>
          <p className="text-[11px] text-[#6B7A70]">Baseado no resultado do período: {periodo}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-[10px] font-semibold text-[#6B7A70] uppercase tracking-wider">
            Resultado do período
          </p>
          <p className="font-serif text-xl font-bold text-[#1E3A2F]">
            <AnimatedCounter value={resultado} prefix="R$ " />
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Sócios 50/50 + Reserva */}
        <div className="space-y-3">
          {/* Sócio 1 */}
          <div className="rounded-xl border border-[#E8E4DA] bg-[#FAF8F3] p-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EFF3F0] text-[#3E7C4F]">
                <Users className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-semibold text-[#1E3A2F]">Sócio 1</p>
                <p className="text-[11px] text-[#8EA598]">50% do resultado</p>
              </div>
            </div>
            <p className="font-serif text-lg font-bold text-[#3E7C4F]">
              <AnimatedCounter value={socio} prefix="R$ " />
            </p>
          </div>

          {/* Sócio 2 */}
          <div className="rounded-xl border border-[#E8E4DA] bg-[#FAF8F3] p-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EFF3F0] text-[#3E7C4F]">
                <Users className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-semibold text-[#1E3A2F]">Sócio 2</p>
                <p className="text-[11px] text-[#8EA598]">50% do resultado</p>
              </div>
            </div>
            <p className="font-serif text-lg font-bold text-[#3E7C4F]">
              <AnimatedCounter value={socio} prefix="R$ " />
            </p>
          </div>

          {/* Reserva configurável */}
          <div className="rounded-xl border border-[#C9A227]/40 bg-[#FAF3E0]/50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FAF3E0] text-[#C9A227]">
                  <Landmark className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-[#1E3A2F]">Reserva da Empresa</p>
                  <p className="text-[11px] text-[#8EA598]">Percentual retido do resultado</p>
                </div>
              </div>
              <p className="font-serif text-lg font-bold text-[#C9A227] whitespace-nowrap">
                <AnimatedCounter value={reserva} prefix="R$ " />
              </p>
            </div>
            <div className="mt-3 flex items-center gap-2 border-t border-[#C9A227]/25 pt-3">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={reservaInput}
                onChange={(e) => {
                  setReservaInput(e.target.value)
                  setReservaSavedAt('')
                }}
                className="h-8 w-20 rounded-lg border-[#E8E4DA] text-xs focus:ring-[#C9A227]"
              />
              <span className="text-xs text-[#6B7A70] font-medium">%</span>
              <Button
                size="sm"
                onClick={applyReserva}
                disabled={savingReserva}
                className="ml-auto h-8 px-3 bg-[#C9A227] hover:bg-[#A8861D] text-white text-[11px] font-semibold"
              >
                {savingReserva ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Salvar %'}
              </Button>
              {reservaSavedAt === 'ok' && (
                <span className="text-[11px] text-[#3E7C4F] font-medium">Salvo ✓</span>
              )}
              {reservaSavedAt === 'error' && (
                <span className="text-[11px] text-[#B3452F] font-medium">Erro ao salvar</span>
              )}
              {reservaSavedAt === 'invalid' && (
                <span className="text-[11px] text-[#B3452F] font-medium">Informe 0–100</span>
              )}
            </div>
          </div>
        </div>

        {/* Aportes de investidores */}
        <div className="rounded-xl border border-[#E8E4DA] p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EFF3F0] text-[#3E7C4F]">
              <HandCoins className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-semibold text-[#1E3A2F]">Aportes de Investidores</p>
              <p className="text-[11px] text-[#8EA598]">
                Registre aportes livres — nome e valor/percentual flexíveis
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <Input
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              placeholder="Nome do investidor"
              className="h-9 rounded-lg border-[#E8E4DA] text-xs focus:ring-[#C9A227]"
            />
            <Input
              type="number"
              min="0"
              step="0.01"
              value={novoValor}
              onChange={(e) => setNovoValor(e.target.value)}
              placeholder="Valor (R$)"
              className="h-9 rounded-lg border-[#E8E4DA] text-xs sm:w-32 focus:ring-[#C9A227]"
            />
            <Button
              onClick={addInvestidor}
              disabled={!novoNome.trim() || !novoValor}
              className="h-9 px-3 bg-[#C9A227] hover:bg-[#A8861D] text-white text-xs font-semibold flex items-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar
            </Button>
          </div>

          {investidores.length === 0 ? (
            <p className="text-[11px] text-[#8EA598] text-center py-3 border-t border-[#E8E4DA]/60">
              Nenhum aporte registrado nesta sessão.
            </p>
          ) : (
            <div className="space-y-2 border-t border-[#E8E4DA]/60 pt-3">
              {investidores.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between rounded-lg border border-[#E8E4DA] bg-[#FAF8F3] px-3 py-2"
                >
                  <div>
                    <p className="text-xs font-semibold text-[#1E3A2F]">{inv.nome}</p>
                    <p className="text-[11px] text-[#8EA598]">
                      {formatCurrency(inv.valor)} ·{' '}
                      {resultado > 0 ? `${inv.percentual.toFixed(1)}% do resultado` : '—'}
                    </p>
                  </div>
                  <button
                    onClick={() => removeInvestidor(inv.id)}
                    className="text-[#B3452F] hover:text-[#8F2F1E] transition-colors"
                    title="Remover aporte"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
