import React, { useMemo } from 'react'
import type { Movement } from '@/types/database'
import { formatCurrency } from './AnimatedCounter'

interface FinancialChartProps {
  movements: Movement[]
}

interface DayData {
  dayLabel: string
  dateStr: string
  entradas: number
  saidas: number
}

export const FinancialChart: React.FC<FinancialChartProps> = ({ movements }) => {
  const chartData: DayData[] = useMemo(() => {
    // Agrupa pelos últimos 7 dias
    const days: DayData[] = []
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const yyyy = d.getFullYear()
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      const dateStr = `${yyyy}-${mm}-${dd}`
      const dayLabel = dayNames[d.getDay()]

      days.push({
        dayLabel,
        dateStr,
        entradas: 0,
        saidas: 0,
      })
    }

    movements.forEach((m) => {
      if (!m.date) return
      const mDateStr = m.date.split('T')[0]
      const found = days.find((d) => d.dateStr === mDateStr)
      if (found) {
        if (m.type === 'entrada') {
          found.entradas += Number(m.amount) || 0
        } else if (m.type === 'saida') {
          found.saidas += Number(m.amount) || 0
        }
      }
    })

    return days
  }, [movements])

  const maxVal = useMemo(() => {
    let max = 1000
    chartData.forEach((d) => {
      if (d.entradas > max) max = d.entradas
      if (d.saidas > max) max = d.saidas
    })
    return Math.ceil(max * 1.15)
  }, [chartData])

  return (
    <div className="flex flex-col h-full justify-between">
      {/* Top Legend */}
      <div className="flex items-center justify-between pb-4 border-b border-[#E8E4DA]/80">
        <div>
          <h3 className="font-serif text-lg font-bold text-[#1E3A2F]">Fluxo dos Últimos 7 Dias</h3>
          <p className="text-xs text-[#6B7A70]">
            Comparativo diário entre entradas (vendas) e saídas operacionais
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[#3E7C4F]" />
            <span className="text-[#1F2A24]">Entradas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[#B3452F]" />
            <span className="text-[#1F2A24]">Saídas</span>
          </div>
        </div>
      </div>

      {/* Chart visualization */}
      <div className="pt-6 pb-2">
        <div className="grid grid-cols-7 gap-2 sm:gap-4 h-48 sm:h-52 items-end">
          {chartData.map((day, idx) => {
            const entradaHeight = Math.max((day.entradas / maxVal) * 100, 3)
            const saidaHeight = Math.max((day.saidas / maxVal) * 100, 3)

            return (
              <div
                key={day.dateStr}
                className="flex flex-col items-center h-full justify-end group relative"
              >
                {/* Tooltip on Hover */}
                <div className="absolute -top-14 hidden group-hover:flex flex-col items-center z-30 pointer-events-none transition-all">
                  <div className="bg-[#1E3A2F] text-white text-[11px] py-1 px-2.5 rounded-lg shadow-xl whitespace-nowrap">
                    <p className="font-bold text-[#C9A227]">
                      {day.dayLabel} ({day.dateStr})
                    </p>
                    <p className="text-emerald-300">+{formatCurrency(day.entradas)}</p>
                    <p className="text-rose-300">-{formatCurrency(day.saidas)}</p>
                  </div>
                  <div className="w-2 h-2 bg-[#1E3A2F] rotate-45 -mt-1" />
                </div>

                {/* Bars Container */}
                <div className="flex items-end gap-1 sm:gap-2 w-full justify-center h-[82%] px-0.5">
                  {/* Entrada Bar */}
                  <div
                    style={{
                      height: `${entradaHeight}%`,
                      animationDelay: `${idx * 40}ms`,
                    }}
                    className="w-1/2 max-w-[18px] bg-gradient-to-t from-[#2A5436] to-[#3E7C4F] rounded-t-md hover:brightness-110 transition-all duration-300 animate-bar-bloom cursor-pointer"
                  />

                  {/* Saída Bar */}
                  <div
                    style={{
                      height: `${saidaHeight}%`,
                      animationDelay: `${idx * 40 + 20}ms`,
                    }}
                    className="w-1/2 max-w-[18px] bg-gradient-to-t from-[#8E3220] to-[#B3452F] rounded-t-md hover:brightness-110 transition-all duration-300 animate-bar-bloom cursor-pointer"
                  />
                </div>

                {/* Day Label */}
                <div className="mt-2 text-center">
                  <span className="text-xs font-semibold text-[#1F2A24]">{day.dayLabel}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Grid lines indicator */}
      <div className="flex justify-between items-center text-[10px] text-[#8EA598] pt-2 border-t border-[#E8E4DA]/60">
        <span>Mín: R$ 0,00</span>
        <span>Pico semanal: ~{formatCurrency(maxVal)}</span>
      </div>
    </div>
  )
}
