import { useEffect, useMemo, useState } from 'react'
import { Search, ShoppingBag, Trash2, Plus, AlertCircle, Package } from 'lucide-react'
import type { Product, SaleChannel } from '@/types/database'
import { channelLabels } from '@/lib/labels'
import { formatCurrency } from '@/components/AnimatedCounter'
import { getProducts, getKitAvailableQuantity } from '@/services/products'
import { createSale, type SaleItemInput } from '@/services/sales'
import { KitBadge } from '@/components/KitBadge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

interface NewSaleModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

interface CartItem {
  product: Product
  quantity: number
  unitPrice: number
  subtotal: number
}

/** Preço de referência: promo_price quando o encantamento está ativo, senão price. */
export function effectiveUnitPrice(p: Product): number {
  if (p.promo_price && Number(p.promo_price) > 0) return Number(p.promo_price)
  return Number(p.price) || 0
}

export default function NewSaleModal({ open, onOpenChange, onSuccess }: NewSaleModalProps) {
  const { toast } = useToast()

  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [search, setSearch] = useState('')
  const [channel, setChannel] = useState<SaleChannel>('instagram')
  const [customer, setCustomer] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setLoadingProducts(true)
    // expand componentes: estoque do kit é calculado a partir dos componentes
    getProducts({ sort: 'name', expand: 'components' })
      .then(setProducts)
      .catch(() => {
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar o estoque.',
          variant: 'destructive',
        })
      })
      .finally(() => setLoadingProducts(false))
  }, [open, toast])

  useEffect(() => {
    if (!open) {
      setSearch('')
      setCustomer('')
      setCart([])
      setError('')
      setChannel('instagram')
    }
  }, [open])

  // Estoque atualizado em tempo real: reflete nos itens já no carrinho
  const stockOf = (productId: string): number => {
    const fresh = products.find((p) => p.id === productId)
    if (fresh) {
      if (fresh.product_type === 'kit') {
        const avail = getKitAvailableQuantity(fresh, fresh.expand?.components || [])
        return avail === null ? Infinity : avail
      }
      return Math.max(Number(fresh.quantity) || 0, 0)
    }
    const inCart = cart.find((c) => c.product.id === productId)
    return inCart ? Math.max(Number(inCart.product.quantity) || 0, 0) : 0
  }

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = q
      ? products.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            (p.description && p.description.toLowerCase().includes(q)),
        )
      : products
    return list.slice(0, 8)
  }, [products, search])

  const addProduct = (product: Product) => {
    const stock = stockOf(product.id)
    if (stock <= 0) {
      toast({
        title: 'Sem estoque',
        description: `"${product.name}" está esgotado.`,
        variant: 'destructive',
      })
      return
    }
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === product.id)
      if (existing) {
        if (existing.quantity + 1 > stock) {
          toast({
            title: 'Estoque insuficiente',
            description: `Há apenas ${stock} un. de "${product.name}" em estoque.`,
            variant: 'destructive',
          })
          return prev
        }
        return prev.map((c) =>
          c.product.id === product.id
            ? { ...c, quantity: c.quantity + 1, subtotal: (c.quantity + 1) * c.unitPrice }
            : c,
        )
      }
      const unitPrice = effectiveUnitPrice(product)
      return [...prev, { product, quantity: 1, unitPrice, subtotal: unitPrice }]
    })
  }

  const updateQuantity = (productId: string, value: number) => {
    const stock = stockOf(productId)
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.product.id !== productId) return c
          const qty = Math.min(Math.max(value, 0), stock)
          return { ...c, quantity: qty, subtotal: qty * c.unitPrice }
        })
        .filter((c) => c.quantity > 0),
    )
  }

  const removeItem = (productId: string) => {
    setCart((prev) => prev.filter((c) => c.product.id !== productId))
  }

  const total = useMemo(() => cart.reduce((acc, c) => acc + c.subtotal, 0), [cart])
  const totalItems = useMemo(() => cart.reduce((acc, c) => acc + c.quantity, 0), [cart])

  const handleFinish = async () => {
    setError('')
    if (cart.length === 0) {
      setError('Adicione pelo menos um produto à venda.')
      return
    }
    if (total <= 0) {
      setError('O total da venda deve ser maior que zero.')
      return
    }

    setSaving(true)
    try {
      const items: SaleItemInput[] = cart.map((c) => ({
        product: c.product.id,
        quantity: c.quantity,
        unit_price: c.unitPrice,
      }))
      await createSale({
        channel,
        date: new Date().toISOString().replace('T', ' ').slice(0, 19) + 'Z',
        customer: customer.trim(),
        items,
      })
      toast({
        title: 'Venda finalizada com encanto ✦',
        description: `Pedido de ${formatCurrency(total)} registrado e estoque atualizado.`,
      })
      onOpenChange(false)
      onSuccess?.()
    } catch (err: unknown) {
      const pbErr = err as { message?: string }
      setError(pbErr.message || 'Erro ao registrar a venda. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[680px] max-h-[92vh] overflow-y-auto bg-white border-[#E8E4DA] p-6 sm:p-7 rounded-2xl">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FAF3E0] text-[#C9A227]">
              <ShoppingBag className="h-4 w-4" />
            </span>
            <DialogTitle className="font-serif text-2xl text-[#1E3A2F]">Nova Venda</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-[#6B7A70]">
            Monte o pedido com um ou mais produtos do estoque. Ao finalizar, o estoque é atualizado
            automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-5">
          {/* Canal + Cliente */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#6B7A70] uppercase tracking-wider">
                Canal de Venda
              </label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as SaleChannel)}
                className="mt-1 w-full h-10 rounded-lg border border-[#E8E4DA] bg-white px-3 text-xs sm:text-sm text-[#1F2A24] focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
              >
                {(Object.keys(channelLabels) as SaleChannel[]).map((c) => (
                  <option key={c} value={c}>
                    {channelLabels[c]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#6B7A70] uppercase tracking-wider">
                Cliente (opcional)
              </label>
              <Input
                type="text"
                placeholder="Nome do cliente..."
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                className="mt-1 h-10 border-[#E8E4DA] bg-white focus-visible:ring-[#C9A227] text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* Busca de produtos */}
          <div>
            <label className="text-xs font-semibold text-[#6B7A70] uppercase tracking-wider">
              Produtos do Estoque
            </label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8EA598]" />
              <Input
                type="text"
                placeholder="Buscar produto por nome ou descrição..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 border-[#E8E4DA] bg-white focus-visible:ring-[#C9A227] text-xs sm:text-sm"
              />
            </div>

            <div className="mt-2 rounded-xl border border-[#E8E4DA] divide-y divide-[#E8E4DA]/70 max-h-56 overflow-y-auto">
              {loadingProducts ? (
                <div className="p-5 text-center text-xs text-[#6B7A70]">Carregando estoque...</div>
              ) : filteredProducts.length === 0 ? (
                <div className="p-5 text-center text-xs text-[#6B7A70]">
                  Nenhum produto encontrado.
                </div>
              ) : (
                filteredProducts.map((p) => {
                  const stock = stockOf(p.id)
                  const hasPromo = Boolean(p.promo_price && Number(p.promo_price) > 0)
                  const unitPrice = effectiveUnitPrice(p)
                  const outOfStock = stock <= 0
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addProduct(p)}
                      disabled={outOfStock}
                      className={`w-full flex items-center justify-between gap-3 p-3 text-left transition-colors ${
                        outOfStock ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#FAF8F3]'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p className="font-serif text-sm font-bold text-[#1E3A2F] truncate">
                            {p.name}
                          </p>
                          {p.product_type === 'kit' && <KitBadge />}
                        </div>
                        <p className="text-[11px] text-[#6B7A70]">
                          {hasPromo ? (
                            <>
                              <span className="line-through mr-1">{formatCurrency(p.price)}</span>
                              <span className="font-bold text-[#C9A227]">
                                {formatCurrency(unitPrice)}
                              </span>
                            </>
                          ) : (
                            <span className="font-semibold text-[#1E3A2F]">
                              {formatCurrency(unitPrice)}
                            </span>
                          )}
                          {' · '}
                          <span className={outOfStock ? 'text-[#B3452F] font-semibold' : ''}>
                            {outOfStock
                              ? 'Esgotado'
                              : p.product_type === 'kit'
                                ? Number.isFinite(stock)
                                  ? `${stock} kits disponíveis (conforme componentes)`
                                  : 'Sem limite próprio de estoque'
                                : `${stock} ${p.unit === 'peso' ? 'kg' : 'un.'} em estoque`}
                          </span>
                        </p>
                      </div>
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                          outOfStock ? 'bg-[#F7EBEA] text-[#B3452F]' : 'bg-[#EFF3F0] text-[#3E7C4F]'
                        }`}
                      >
                        {outOfStock ? (
                          <Package className="h-3.5 w-3.5" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Carrinho */}
          {cart.length > 0 && (
            <div className="rounded-xl border border-[#E8E4DA] overflow-hidden">
              <div className="bg-[#FAF8F3] px-4 py-2.5 border-b border-[#E8E4DA]">
                <p className="text-[11px] font-semibold text-[#6B7A70] uppercase tracking-wider">
                  Itens do Pedido ({totalItems})
                </p>
              </div>
              <div className="divide-y divide-[#E8E4DA]/70">
                {cart.map((c) => (
                  <div key={c.product.id} className="p-3 flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="font-serif text-sm font-bold text-[#1E3A2F] truncate">
                          {c.product.name}
                        </p>
                        {c.product.product_type === 'kit' && <KitBadge />}
                      </div>
                      <p className="text-[11px] text-[#6B7A70] font-mono">
                        {formatCurrency(c.unitPrice)} /{' '}
                        {c.product.product_type === 'kit'
                          ? 'kit'
                          : c.product.unit === 'peso'
                            ? 'kg'
                            : 'un.'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateQuantity(c.product.id, c.quantity - 1)}
                        className="h-7 w-7 rounded-md border border-[#E8E4DA] text-[#6B7A70] hover:bg-[#FAF8F3] flex items-center justify-center text-sm font-bold"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={
                          Number.isFinite(stockOf(c.product.id)) ? stockOf(c.product.id) : undefined
                        }
                        value={c.quantity}
                        onChange={(e) => updateQuantity(c.product.id, Number(e.target.value) || 0)}
                        className="w-14 h-7 text-center text-xs rounded-md border border-[#E8E4DA] focus:outline-none focus:ring-1 focus:ring-[#C9A227] tabular-nums"
                      />
                      <button
                        type="button"
                        onClick={() => updateQuantity(c.product.id, c.quantity + 1)}
                        className="h-7 w-7 rounded-md border border-[#E8E4DA] text-[#6B7A70] hover:bg-[#FAF8F3] flex items-center justify-center text-sm font-bold"
                      >
                        +
                      </button>
                    </div>
                    <p className="w-20 text-right text-sm font-bold text-[#1E3A2F] font-mono tabular-nums">
                      {formatCurrency(c.subtotal)}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeItem(c.product.id)}
                      title="Remover item"
                      className="h-7 w-7 rounded-md text-[#B3452F] hover:bg-[#F7EBEA] flex items-center justify-center"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="bg-[#FAF8F3] px-4 py-3 border-t border-[#E8E4DA] flex items-center justify-between">
                <span className="text-xs font-semibold text-[#6B7A70] uppercase tracking-wider">
                  Total Geral
                </span>
                <span className="font-serif text-xl font-bold text-[#C9A227] tabular-nums">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
          )}

          {/* Erro */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-[#F7EBEA] border border-[#EBBBB3] p-3 text-xs text-[#B3452F]">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Ações */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E8E4DA]/60">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-[#E8E4DA] text-xs font-semibold"
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleFinish}
              disabled={saving || cart.length === 0}
              className="bg-[#C9A227] hover:bg-[#A8861D] text-white font-semibold text-xs sm:text-sm h-10 px-5 flex items-center gap-1.5 shadow"
            >
              {saving ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Finalizando...
                </>
              ) : (
                <>
                  <ShoppingBag className="h-4 w-4" />
                  Finalizar Venda
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
