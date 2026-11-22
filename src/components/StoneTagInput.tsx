import React, { useMemo, useRef, useState, useEffect } from 'react'
import { ChevronDown, X, Gem } from 'lucide-react'

import type { Stone } from '@/types/database'
import { slugifyStoneName } from '@/services/stones'
import { stoneTagColor } from '@/lib/stone-colors'
import { cn } from '@/lib/utils'

interface StoneTagInputProps {
  /** Pedras disponíveis (coleção `stones`, via useStones). */
  stones: Stone[]
  /** Ids das pedras selecionadas no produto (relation products.stones). */
  value: string[]
  onChange: (ids: string[]) => void
  /** Cria uma pedra nova na coleção `stones` e devolve o registro. */
  onCreateStone: (name: string) => Promise<Stone>
  disabled?: boolean
}

/**
 * Campo de tags dinâmico de "Pedras e Composição":
 * - dropdown com sugestões das pedras cadastradas ao clicar;
 * - digitação de pedra nova com criação automática na coleção `stones`;
 * - seleção múltipla, exibida como tags coloridas pequenas com X para remover.
 */
export function StoneTagInput({
  stones,
  value,
  onChange,
  onCreateStone,
  disabled,
}: StoneTagInputProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedSet = useMemo(() => new Set(value), [value])

  const byId = useMemo(() => {
    const map: Record<string, Stone> = {}
    for (const s of stones) map[s.id] = s
    return map
  }, [stones])

  // Sugestões: pedras ainda não selecionadas que combinam com o que foi digitado
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    return stones.filter(
      (s) => !selectedSet.has(s.id) && (q === '' || s.name.toLowerCase().includes(q)),
    )
  }, [stones, query, selectedSet])

  const typedSlug = slugifyStoneName(query.trim())
  const exactMatch = typedSlug && stones.some((s) => s.slug === typedSlug)
  const canCreate = typedSlug !== '' && !exactMatch

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    if (!open) return
    const onClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  const handleSelect = (stone: Stone) => {
    if (selectedSet.has(stone.id)) return
    onChange([...value, stone.id])
    setQuery('')
    inputRef.current?.focus()
  }

  const handleRemove = (id: string) => {
    onChange(value.filter((v) => v !== id))
  }

  const handleCreate = async () => {
    if (!canCreate || creating || disabled) return
    setCreating(true)
    setError(null)
    try {
      const stone = await onCreateStone(query.trim())
      onChange([...value, stone.id])
      setQuery('')
      inputRef.current?.focus()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar a pedra.'
      setError(message)
    } finally {
      setCreating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      if (suggestions.length === 1) {
        handleSelect(suggestions[0])
      } else if (canCreate) {
        handleCreate()
      }
      return
    }
    if (e.key === 'Backspace' && query === '' && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div
        onClick={() => {
          if (!disabled) {
            setOpen(true)
            inputRef.current?.focus()
          }
        }}
        className={cn(
          'min-h-[40px] w-full cursor-text rounded-md border bg-white px-2 py-1.5 text-sm',
          'border-[#E8E4DA] focus-within:ring-2 focus-within:ring-[#C9A227]',
          open && 'ring-2 ring-[#C9A227]',
          disabled && 'opacity-60 cursor-not-allowed',
        )}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          {value.map((id) => {
            const stone = byId[id]
            const label = stone?.name ?? id
            const style = stone ? stoneTagColor(stone) : undefined

            return (
              <span
                key={id}
                style={
                  style
                    ? { backgroundColor: style.bg, color: style.text, borderColor: style.border }
                    : undefined
                }
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border',
                  !style && 'bg-[#F0F2F1] text-[#55665C] border-[#D0D8D4]',
                )}
              >
                {label}
                <button
                  type="button"
                  disabled={disabled}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemove(id)
                  }}
                  className="hover:opacity-70 transition"
                  title={`Remover ${label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )
          })}

          <input
            ref={inputRef}
            type="text"
            value={query}
            disabled={disabled}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
              setError(null)
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={value.length === 0 ? 'Selecione ou digite uma pedra...' : 'Adicionar...'}
            className="flex-1 min-w-[120px] bg-transparent text-sm text-[#1F2A24] placeholder:text-[#8EA598] focus:outline-none py-0.5"
          />

          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-[#8EA598] transition-transform',
              open && 'rotate-180',
            )}
          />
        </div>
      </div>

      {open && !disabled && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-[#E8E4DA] bg-white shadow-lg overflow-hidden">
          {suggestions.length > 0 && (
            <ul className="max-h-48 overflow-y-auto py-1">
              {suggestions.map((stone) => {
                const style = stoneTagColor(stone)
                return (
                  <li key={stone.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(stone)}
                      className="w-full flex items-center justify-between px-3 py-2 text-left text-sm text-[#1F2A24] hover:bg-[#FAF8F3] transition"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full border"
                          style={{ backgroundColor: style.bg, borderColor: style.text }}
                        />
                        {stone.name}
                      </span>
                      <Gem className="h-3.5 w-3.5 text-[#C9A227] opacity-60" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          {canCreate && (
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm text-[#3E7C4F] font-semibold hover:bg-[#EFF3F0] transition border-t border-[#E8E4DA]"
            >
              <Gem className="h-4 w-4 text-[#C9A227]" />
              {creating ? 'Salvando...' : `Criar "${query.trim()}"`}
              <span className="ml-auto text-[10px] font-normal text-[#8EA598]">nova pedra</span>
            </button>
          )}

          {suggestions.length === 0 && !canCreate && (
            <p className="px-3 py-2.5 text-xs text-[#8EA598]">
              Nenhuma pedra encontrada para &quot;{query.trim()}&quot;.
            </p>
          )}
        </div>
      )}

      {error && <p className="text-xs text-[#B3452F] mt-1">{error}</p>}
    </div>
  )
}

export default StoneTagInput
