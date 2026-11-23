import React, { useState, useEffect, useMemo } from 'react'
import { PackageOpen, Sparkles, Trash2, AlertCircle } from 'lucide-react'
import type { Product, ProductCategory, ProductType, ProductUnit } from '@/types/database'
import { createProduct, updateProduct, deleteProduct, validateKit } from '@/services/products'
import { categoryLabels, categoryStyles } from '@/lib/labels'
import { useStones } from '@/hooks/useStones'
import { getProducts } from '@/services/products'
import { KitBadge } from '@/components/KitBadge'
import StoneTagInput from '@/components/StoneTagInput'
import KitComponentsInput from '@/components/KitComponentsInput'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/context/AuthContext'

interface ProductModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: Product | null
  onSuccess?: () => void
}

export { categoryLabels, categoryStyles }

export default function ProductModal({
  open,
  onOpenChange,
  product,
  onSuccess,
}: ProductModalProps) {
  const { toast } = useToast()
  const { role } = useAuth()
  const { stones: stoneOptions, createStone } = useStones()
  const isAdmin = role === 'admin'

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [quantity, setQuantity] = useState<string>('1')
  const [unit, setUnit] = useState<ProductUnit>('unidade')
  const [cost, setCost] = useState<string>('')
  const [price, setPrice] = useState<string>('')
  const [promoPrice, setPromoPrice] = useState<string>('')
  const [category, setCategory] = useState<ProductCategory | ''>('')
  const [stones, setStones] = useState<string[]>([])
  const [productType, setProductType] = useState<ProductType>('individual')
  const [components, setComponents] = useState<string[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])

  const [saving, setSaving] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isEditing = Boolean(product)

  // Lista de produtos cadastrados (opções de componente do kit)
  useEffect(() => {
    if (!open) return
    getProducts({ sort: 'name' })
      .then(setAllProducts)
      .catch(() => setAllProducts([]))
  }, [open])

  useEffect(() => {
    if (product) {
      setName(product.name || '')
      setDescription(product.description || '')
      setQuantity(String(product.quantity ?? 0))
      setUnit(product.unit || 'unidade')
      setCost(String(product.cost ?? ''))
      setPrice(String(product.price ?? ''))
      setPromoPrice(
        product.promo_price && product.promo_price > 0 ? String(product.promo_price) : '',
      )
      setCategory(product.category || '')
      setStones(Array.isArray(product.stones) ? product.stones : [])
      setProductType(product.product_type === 'kit' ? 'kit' : 'individual')
      setComponents(Array.isArray(product.components) ? product.components : [])
    } else {
      setName('')
      setDescription('')
      setQuantity('1')
      setUnit('unidade')
      setCost('')
      setPrice('')
      setPromoPrice('')
      setCategory('')
      setStones([])
      setProductType('individual')
      setComponents([])
    }
    setErrors({})
  }, [product, open])

  const isKit = productType === 'kit'

  // Cálculo da margem estimada ao digitar
  const numCost = parseFloat(cost) || 0
  const numPrice = parseFloat(promoPrice) || parseFloat(price) || 0
  const estimatedMargin = numPrice > 0 ? Math.round(((numPrice - numCost) / numPrice) * 100) : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    const fieldErrors: Record<string, string> = {}
    if (!name.trim()) fieldErrors.name = 'O nome do produto é obrigatório.'
    if (quantity === '' || isNaN(Number(quantity)) || Number(quantity) < 0) {
      fieldErrors.quantity = 'Informe uma quantidade válida (>= 0).'
    }
    if (cost === '' || isNaN(Number(cost)) || Number(cost) < 0) {
      fieldErrors.cost = 'Informe um valor de custo válido.'
    }
    if (price === '' || isNaN(Number(price)) || Number(price) <= 0) {
      fieldErrors.price = 'Informe um valor de venda válido (> 0).'
    }
    if (promoPrice !== '' && !isNaN(Number(promoPrice)) && Number(promoPrice) <= 0) {
      fieldErrors.promo_price = 'O valor promocional deve ser maior que zero.'
    }
    if (!category) {
      fieldErrors.category = 'Selecione a categoria do produto.'
    }

    const kitError = validateKit(productType, components, product?.id)
    if (kitError) fieldErrors.components = kitError

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors)
      return
    }

    setSaving(true)

    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        quantity: Number(quantity),
        unit,
        cost: Number(cost),
        price: Number(price),
        promo_price: promoPrice ? Number(promoPrice) : 0,
        category: category as ProductCategory,
        stones,
        product_type: productType,
        components: isKit ? components : [],
      }

      if (isEditing && product) {
        await updateProduct(product.id, payload)
        toast({
          title: 'Produto atualizado!',
          description: `"${name}" teve suas informações salvas com sucesso.`,
        })
      } else {
        await createProduct(payload)
        toast({
          title: 'Produto adicionado com encanto ✦',
          description: `"${name}" foi registrado no estoque do atelier.`,
        })
      }

      onOpenChange(false)
      onSuccess?.()
    } catch (err: unknown) {
      const pbErr = err as {
        data?: { data?: Record<string, { message: string }> }
        message?: string
      }
      if (pbErr.data?.data) {
        const inlineErrors: Record<string, string> = {}
        for (const [key, val] of Object.entries(pbErr.data.data)) {
          inlineErrors[key] = val.message
        }
        setErrors(inlineErrors)
      } else {
        setErrors({ general: pbErr.message || 'Erro ao salvar produto. Tente novamente.' })
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!product) return
    setDeleting(true)
    try {
      await deleteProduct(product.id)
      toast({
        title: 'Produto removido',
        description: `"${product.name}" foi excluído do catálogo.`,
      })
      setDeleteConfirmOpen(false)
      onOpenChange(false)
      onSuccess?.()
    } catch (err: unknown) {
      const pbErr = err as { message?: string }
      toast({
        title: 'Erro ao remover',
        description: pbErr.message || 'Não foi possível excluir o produto.',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[560px] max-h-[92vh] overflow-y-auto bg-white border-[#E8E4DA] p-6 sm:p-7 rounded-2xl">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FAF3E0] text-[#C9A227]">
                <Sparkles className="h-4 w-4" />
              </span>
              <DialogTitle className="font-serif text-2xl text-[#1E3A2F]">
                {isEditing ? 'Editar Produto do Atelier' : 'Novo Produto do Atelier'}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-[#6B7A70]">
              {isEditing
                ? 'Atualize os valores de custo, venda, quantidade ou encantamento.'
                : 'Cadastre pedras brutas, lapidadas, joias e artigos de decoração.'}
            </DialogDescription>
          </DialogHeader>

          {errors.general && (
            <div className="rounded-xl border border-[#B3452F]/30 bg-[#F7EBEA] p-3 text-xs text-[#B3452F] flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errors.general}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {/* Nome */}
            <div>
              <label className="block text-xs font-semibold text-[#1E3A2F] mb-1">
                Nome da Pedra / Joia <span className="text-[#B3452F]">*</span>
              </label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Ametista Drusa Extra"
                required
                className="h-10 border-[#E8E4DA] focus-visible:ring-[#C9A227]"
              />
              {errors.name && <p className="text-xs text-[#B3452F] mt-1">{errors.name}</p>}
            </div>

            {/* Categoria e Unidade */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#1E3A2F] mb-1">
                  Categoria <span className="text-[#B3452F]">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ProductCategory)}
                  required
                  className="w-full h-10 rounded-md border border-[#E8E4DA] bg-white px-3 text-sm text-[#1F2A24] focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
                >
                  <option value="" disabled>
                    Selecione a categoria...
                  </option>
                  {(
                    ['decoracao', 'joia', 'kit', 'acessorio', 'base', 'outros'] as ProductCategory[]
                  ).map((value) => (
                    <option key={value} value={value}>
                      {categoryLabels[value]}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="text-xs text-[#B3452F] mt-1">{errors.category}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E3A2F] mb-1">
                  Unidade de Medida <span className="text-[#B3452F]">*</span>
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as ProductUnit)}
                  className="w-full h-10 rounded-md border border-[#E8E4DA] bg-white px-3 text-sm text-[#1F2A24] focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
                >
                  <option value="unidade">Unidade (un.)</option>
                  <option value="peso">Peso (kg)</option>
                </select>
                {errors.unit && <p className="text-xs text-[#B3452F] mt-1">{errors.unit}</p>}
              </div>
            </div>

            {/* Pedras e composição (tags dinâmicas) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-[#1E3A2F]">Pedras e Composição</label>
                <span className="text-[11px] text-[#8EA598] font-medium">
                  Opcional — ex.: base, led ou sacola
                </span>
              </div>
              <StoneTagInput
                stones={stoneOptions}
                value={stones}
                onChange={setStones}
                onCreateStone={createStone}
              />
            </div>

            {/* Tipo do produto */}
            <div>
              <label className="block text-xs font-semibold text-[#1E3A2F] mb-1">
                Tipo do Produto <span className="text-[#B3452F]">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { value: 'individual', label: 'Individual', hint: 'Peça única' },
                    { value: 'kit', label: 'Kit', hint: 'Combo de produtos' },
                  ] as { value: ProductType; label: string; hint: string }[]
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setProductType(opt.value)}
                    className={`h-10 rounded-lg border text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                      productType === opt.value
                        ? 'bg-[#1E3A2F] text-white border-[#1E3A2F] shadow'
                        : 'bg-white text-[#6B7A70] border-[#E8E4DA] hover:border-[#C9A227]/60'
                    }`}
                  >
                    {opt.label === 'Kit' && <PackageOpen className="h-3.5 w-3.5" />}
                    <span>{opt.label}</span>
                    <span
                      className={productType === opt.value ? 'text-white/70' : 'text-[#8EA598]'}
                    >
                      · {opt.hint}
                    </span>
                  </button>
                ))}
              </div>
              {errors.product_type && (
                <p className="text-xs text-[#B3452F] mt-1">{errors.product_type}</p>
              )}
            </div>

            {/* Componentes do kit */}
            {isKit && (
              <div className="rounded-xl border border-[#3E7C4F]/30 bg-[#EFF3F0]/40 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#3E7C4F]">
                    <PackageOpen className="h-4 w-4" />
                    <span>Componentes do Kit</span>
                  </div>
                  <span className="text-[11px] text-[#6B7A70] font-medium">
                    Mínimo de 2 produtos
                  </span>
                </div>
                <p className="text-[11px] text-[#6B7A70] leading-snug">
                  Ao vender o kit, a quantidade de cada componente é baixada automaticamente do
                  estoque. O kit em si não tem estoque próprio.
                </p>
                <KitComponentsInput
                  products={allProducts}
                  value={components}
                  onChange={(ids) => setComponents(ids)}
                  selfId={product?.id}
                  editingProduct={product || null}
                />
                {errors.components && <p className="text-xs text-[#B3452F]">{errors.components}</p>}
              </div>
            )}

            {/* Quantidade */}
            {!isKit && (
              <div>
                <label className="block text-xs font-semibold text-[#1E3A2F] mb-1">
                  Quantidade em Estoque {unit === 'peso' ? '(kg)' : '(unidades)'}{' '}
                  <span className="text-[#B3452F]">*</span>
                </label>
                <Input
                  type="number"
                  step={unit === 'peso' ? '0.1' : '1'}
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0"
                  required
                  className="h-10 border-[#E8E4DA] focus-visible:ring-[#C9A227]"
                />
                {errors.quantity && (
                  <p className="text-xs text-[#B3452F] mt-1">{errors.quantity}</p>
                )}
              </div>
            )}

            {/* Custo e Preço de Venda — para kit, preço próprio do combo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#1E3A2F] mb-1">
                  {isKit ? 'Custo do Kit (R$)' : 'Valor de Custo (R$)'}{' '}
                  <span className="text-[#B3452F]">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="0,00"
                  required
                  className="h-10 border-[#E8E4DA] focus-visible:ring-[#C9A227]"
                />
                {errors.cost && <p className="text-xs text-[#B3452F] mt-1">{errors.cost}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E3A2F] mb-1">
                  {isKit ? 'Preço do Kit (R$)' : 'Valor de Venda Regular (R$)'}{' '}
                  <span className="text-[#B3452F]">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0,00"
                  required
                  className="h-10 border-[#E8E4DA] focus-visible:ring-[#C9A227]"
                />
                {errors.price && <p className="text-xs text-[#B3452F] mt-1">{errors.price}</p>}
              </div>
            </div>

            {/* Encantamento (Promoção) */}
            <div className="rounded-xl border border-[#C9A227]/40 bg-[#FAF3E0]/40 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#8E7118]">
                  <Sparkles className="h-4 w-4 text-[#C9A227]" />
                  <span>Encantamento (Valor Promocional)</span>
                </div>
                <span className="text-[11px] text-[#A8861D] font-medium">Opcional</span>
              </div>
              <p className="text-[11px] text-[#6B7A70] leading-snug">
                Ao preencher, o produto exibirá o preço original riscado e o valor de encantamento
                em destaque dourado.
              </p>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={promoPrice}
                onChange={(e) => setPromoPrice(e.target.value)}
                placeholder="Ex: 149,00"
                className="h-9 border-[#C9A227]/50 bg-white focus-visible:ring-[#C9A227]"
              />
              {errors.promo_price && <p className="text-xs text-[#B3452F]">{errors.promo_price}</p>}
            </div>

            {/* Aviso de preço livre do kit */}
            {isKit && (
              <p className="text-[11px] text-[#8E7118] leading-snug">
                O preço do kit pode ser diferente da soma dos componentes — defina livremente o
                valor do combo.
              </p>
            )}

            {/* Prévia da Margem */}
            {numPrice > 0 && (
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#FAF8F3] border border-[#E8E4DA] text-xs">
                <span className="text-[#6B7A70]">Margem de Lucro Estimada:</span>
                <span
                  className={`font-bold px-2 py-0.5 rounded ${
                    estimatedMargin >= 50
                      ? 'bg-[#3E7C4F]/15 text-[#3E7C4F]'
                      : estimatedMargin >= 25
                        ? 'bg-[#C9A227]/20 text-[#8E7118]'
                        : 'bg-[#B3452F]/15 text-[#B3452F]'
                  }`}
                >
                  {estimatedMargin}%
                </span>
              </div>
            )}

            {/* Descrição */}
            <div>
              <label className="block text-xs font-semibold text-[#1E3A2F] mb-1">
                Descrição do Produto
              </label>
              <Textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  isKit
                    ? 'Descreva o que vem no kit (ex.: base, led, pedras escolhidas)...'
                    : 'Detalhes sobre a gema, procedência, lapidação ou utilidade energética...'
                }
                className="border-[#E8E4DA] focus-visible:ring-[#C9A227] text-sm"
              />
              {errors.description && (
                <p className="text-xs text-[#B3452F] mt-1">{errors.description}</p>
              )}
            </div>

            {/* Ações */}
            <div className="flex items-center justify-between pt-4 border-t border-[#E8E4DA]">
              {isEditing && isAdmin ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="border-[#B3452F]/40 text-[#B3452F] hover:bg-[#F7EBEA] hover:text-[#B3452F] h-10 px-3"
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  <span>Excluir</span>
                </Button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="border-[#E8E4DA] text-[#6B7A70] h-10"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-[#C9A227] hover:bg-[#A8861D] text-white font-semibold h-10 px-5 shadow transition"
                >
                  {saving ? (
                    'Salvando...'
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-1.5" />
                      <span>{isEditing ? 'Atualizar Produto' : 'Cadastrar Produto'}</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* AlertDialog de Confirmação de Exclusão */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="bg-white border-[#E8E4DA] max-w-[420px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-xl text-[#1E3A2F]">
              Remover este produto do estoque?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-[#6B7A70]">
              Esta ação excluirá permanentemente o item &quot;{product?.name}&quot; do atelier. Os
              registros financeiros já realizados não serão afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#E8E4DA] text-[#6B7A70]">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-[#B3452F] hover:bg-[#923320] text-white"
            >
              {deleting ? 'Removendo...' : 'Sim, remover produto'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
