import React, { useMemo, useRef, useState, useEffect } from 'react'
import { PackageOpen, Plus, Search, X } from 'lucide-react'
import type { Product } from '@/types/database'
import { formatCurrency } from '@/components/AnimatedCounter'

interface KitComponentsInputProps {
  /** Todos os produtos cadastrados (para buscar componentes) */
  products: Product[]
  value: string[]
  onChange: (ids: string[]) => void
  /** Id do produto em edição — nunca pode entrar no próprio kit */
  selfId?: string
  /** Produto em edição (nome de produtos que deixaram de existir) */
  editingProduct?: Product | null
}

/**
 * Seletor de componentes do kit: busca por nome + lista de componentes
 * escolhidos, seguindo o visual dourado/verde da plataforma.
 */
export default function KitComponentsInput({
  products,
  value,
  onChange,
  selfId,
  editingProduct,
}: KitComponentsInputProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClickOutside = (ev: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(ev.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const selectedMap = useMemo(() => {
    const map: Record<string, Product | undefined> = {}
    for (const p of products) map[p.id] = p
    return map
  }, [products])

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products
      .filter((p) => p.id !== selfId && p.product_type !== 'kit')
      .filter((p) => !value.includes(p.id))
      .filter((p) => (q ? p.name.toLowerCase().includes(q) : true))
      .slice(0, 8)
  }, [products, query, value, selfId])

  const addComponent = (id: string) => {
    if (id === selfId || value.includes(id)) return
    onChange([...value, id])
    setQuery('')
    setOpen(false)
  }

  const removeComponent = (id: string) => {
    onChange(value.filter((v) => v !== id))
  }

  const nameOf = (id: string): string => {
    const p = selectedMap[id]
    if (p) return p.name
    const expanded = editingProduct?.expand?.components?.find((c) => c.id === id)
    return expanded?.name || 'Componente removido'
  }

  return (
    <div className="space-y-2" ref={boxRef}>
      {/* Componentes escolhidos */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((id) => (
            <span
              key={id}
              className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-[11px] font-semibold bg-[#EFF3F0] text-[#1E3A2F] border border-[#3E7C4F]/30"
            >
              <PackageOpen className="h-3 w-3 text-[#3E7C4F]" />
              <span>{nameOf(id)}</span>
              <button
                type="button"
                onClick={() => removeComponent(id)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-[#F7EBEA] text-[#6B7A70] hover:text-[#B3452F] transition"
                title="Remover componente"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Busca de componentes */}
      <div className="relative">
        <div className="flex items-center gap-2 h-9 rounded-lg border border-[#E8E4DA] bg-white px-2.5 focus-within:ring-2 focus-within:ring-[#C9A227]">
          <Search className="h-3.5 w-3.5 text-[#8EA598] shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            placeholder="Buscar produto para adicionar ao kit..."
            className="flex-1 text-xs bg-transparent outline-none text-[#1F2A24] placeholder:text-[#8EA598]"
          />
        </div>

        {open && suggestions.length > 0 && (
          <div className="absolute z-30 mt-1 w-full max-h-56 overflow-y-auto rounded-xl border border-[#E8E4DA] bg-white shadow-lg">
            {suggestions.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => addComponent(p.id)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 hover:bg-[#FAF8F3] transition text-left"
              >
                <span className="text-xs font-semibold text-[#1E3A2F] truncate">{p.name}</span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-[#6B7A70] font-mono">
                    {formatCurrency(p.price)}
                  </span>
                  <Plus className="h-3.5 w-3.5 text-[#C9A227]" />
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {value.length > 0 && value.length < 2 && (
        <p className="text-[11px] text-[#8E7118]">
          Selecione pelo menos 2 produtos para compor o kit.
        </p>
      )}
    </div>
  )
}
