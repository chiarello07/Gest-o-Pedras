import { useEffect, useState } from 'react'
import { Search, Package, Tag, X, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/components/AnimatedCounter'
import { useToast } from '@/hooks/use-toast'
import { getProducts } from '@/services/products'
import { createMovement } from '@/services/movements'
import type { MovementCategory, MovementType, Product } from '@/types/database'
import { movementCategories, movementCategoryLabels } from '@/types/database'

interface NewMovementModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const typeLabels: Record<MovementType, string> = {
  entrada: 'Entrada',
  saida: 'Saída',
}

export default function NewMovementModal({ open, onOpenChange, onSuccess }: NewMovementModalProps) {
  const { toast } = useToast()

  const [type, setType] = useState<MovementType>('saida')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<MovementCategory>('despesa_operacional')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setLoadingProducts(true)
    getProducts({ sort: 'name' })
      .then(setProducts)
      .catch(() => {})
      .finally(() => setLoadingProducts(false))
  }, [open])

  useEffect(() => {
    if (!open) {
      setType('saida')
      setDescription('')
      setAmount('')
      setCategory('despesa_operacional')
      setDate(new Date().toISOString().slice(0, 10))
      setSelectedProducts([])
      setSearch('')
      setError('')
    }
  }, [open])

  const filteredProducts = products.filter((p) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q))
    )
  })

  const toggleProduct = (id: string) => {
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    )
  }

  const handleSubmit = async () => {
    setError('')
    if (!description.trim()) {
      setError('Informe a descrição da movimentação.')
      return
    }
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) {
      setError('Informe um valor válido maior que zero.')
      return
    }
    if (!date) {
      setError('Informe a data da movimentação.')
      return
    }

    setSaving(true)
    try {
      await createMovement({
        type,
        amount: value,
        description: description.trim(),
        date: new Date(`${date}T12:00:00`).toISOString(),
        category,
        products: category === 'compra_produtos' ? selectedProducts : [],
      })
      toast({
        title: 'Movimentação registrada ✦',
        description: `"${description.trim()}" (${typeLabels[type]} de ${formatCurrency(value)}) salva com sucesso.`,
      })
      onOpenChange(false)
      onSuccess()
    } catch (err: unknown) {
      const pbErr = err as { message?: string }
      setError(pbErr.message || 'Erro ao registrar a movimentação. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const isCompra = category === 'compra_produtos'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px] max-h-[92vh] overflow-y-auto bg-white border-[#E8E4DA] p-6 sm:p-7 rounded-2xl">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FAF3E0] text-[#C9A227]">
              <Tag className="h-4 w-4" />
            </span>
            <DialogTitle className="font-serif text-2xl text-[#1E3A2F]">
              Nova Movimentação
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-[#6B7A70]">
            Registre uma entrada ou saída manual no caixa da loja.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {/* Tipo + Data */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#6B7A70] uppercase tracking-wider">
                Tipo
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as MovementType)}
                className="mt-1 w-full h-10 rounded-lg border border-[#E8E4DA] bg-white px-3 text-xs sm:text-sm text-[#1F2A24] focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
              >
                <option value="entrada">Entrada</option>
                <option value="saida">Saída</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#6B7A70] uppercase tracking-wider">
                Data
              </label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 h-10 rounded-lg border-[#E8E4DA] text-xs sm:text-sm focus:ring-[#C9A227]"
              />
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="text-xs font-semibold text-[#6B7A70] uppercase tracking-wider">
              Descrição
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex.: Compra de cristais brutos do fornecedor X"
              className="mt-1 h-10 rounded-lg border-[#E8E4DA] text-xs sm:text-sm focus:ring-[#C9A227]"
            />
          </div>

          {/* Valor + Categoria */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#6B7A70] uppercase tracking-wider">
                Valor (R$)
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                className="mt-1 h-10 rounded-lg border-[#E8E4DA] text-xs sm:text-sm focus:ring-[#C9A227]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#6B7A70] uppercase tracking-wider">
                Categoria
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as MovementCategory)}
                className="mt-1 w-full h-10 rounded-lg border border-[#E8E4DA] bg-white px-3 text-xs sm:text-sm text-[#1F2A24] focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
              >
                {movementCategories.map((c) => (
                  <option key={c} value={c}>
                    {movementCategoryLabels[c]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Vínculo com produtos (somente em compras de produtos) */}
          {isCompra && (
            <div className="rounded-xl border border-[#E8E4DA] bg-[#FAF8F3] p-3">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-[#6B7A70] uppercase tracking-wider flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-[#C9A227]" />
                  Produtos vinculados (opcional)
                </label>
                {selectedProducts.length > 0 && (
                  <button
                    onClick={() => setSelectedProducts([])}
                    className="text-[11px] text-[#C9A227] hover:underline font-medium"
                  >
                    Limpar
                  </button>
                )}
              </div>
              <p className="text-[11px] text-[#8EA598] mb-2">
                Vincule os itens do estoque que entram com esta compra.
              </p>
              {loadingProducts ? (
                <div className="flex items-center gap-2 text-xs text-[#6B7A70] py-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Carregando produtos...
                </div>
              ) : (
                <>
                  <div className="relative mb-2">
                    <Search className="h-3.5 w-3.5 text-[#8EA598] absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar produto..."
                      className="h-8 rounded-lg border-[#E8E4DA] pl-8 text-xs focus:ring-[#C9A227]"
                    />
                  </div>
                  <div className="max-h-32 overflow-y-auto divide-y divide-[#E8E4DA]/60 rounded-lg border border-[#E8E4DA] bg-white">
                    {filteredProducts.length === 0 ? (
                      <p className="text-xs text-[#8EA598] text-center py-3">
                        Nenhum produto encontrado.
                      </p>
                    ) : (
                      filteredProducts.map((p) => {
                        const checked = selectedProducts.includes(p.id)
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => toggleProduct(p.id)}
                            className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-[#FAF8F3] transition-colors"
                          >
                            <span className="text-xs text-[#1F2A24] truncate flex items-center gap-1.5">
                              <span
                                className={`flex h-4 w-4 items-center justify-center rounded border ${
                                  checked
                                    ? 'bg-[#C9A227] border-[#C9A227] text-white'
                                    : 'border-[#E8E4DA] bg-white'
                                }`}
                              >
                                {checked && <span className="text-[9px] font-bold">✓</span>}
                              </span>
                              {p.name}
                            </span>
                            <span className="text-[11px] text-[#6B7A70] whitespace-nowrap">
                              {formatCurrency(Number(p.cost) || 0)}
                            </span>
                          </button>
                        )
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {error && (
            <div className="text-xs text-[#B3452F] bg-[#F7EBEA] border border-[#EBBBB3] rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-[#6B7A70] hover:bg-[#FAF8F3] text-xs sm:text-sm h-10 px-4"
            >
              <X className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="bg-[#C9A227] hover:bg-[#A8861D] text-white font-semibold text-xs sm:text-sm h-10 px-4 flex items-center gap-1.5 shadow"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Tag className="h-4 w-4" />
                  Salvar
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
