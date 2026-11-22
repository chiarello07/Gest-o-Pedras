import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Gem,
  Plus,
  Search,
  Filter,
  Package,
  AlertTriangle,
  CircleDollarSign,
  Sparkles,
  LayoutGrid,
  Table as TableIcon,
} from 'lucide-react'
import type { Product, ProductCategory } from '@/types/database'
import { getProducts } from '@/services/products'
import { useRealtime } from '@/hooks/use-realtime'
import { useAuth } from '@/context/AuthContext'
import { formatCurrency, AnimatedCounter } from '@/components/AnimatedCounter'
import ProductModal from '@/components/ProductModal'
import { categoryLabels, categoryStyles, stoneLabels } from '@/lib/labels'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ProductStoneTags } from '@/components/StoneTags'

export default function Produtos() {
  const { role } = useAuth()
  const isAdmin = role === 'admin'
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros e busca
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('todos')
  const [statusFilter, setStatusFilter] = useState<'todos' | 'disponivel' | 'esgotado'>('todos')
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')

  // Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const list = await getProducts({ sort: '-created' })
      setProducts(list)
    } catch (err) {
      console.error('Erro ao buscar produtos:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useRealtime<Product>('products', () => {
    fetchData()
  })

  // Mini-KPIs no topo
  const totalProducts = products.length
  const outOfStockCount = useMemo(() => {
    return products.filter((p) => (Number(p.quantity) || 0) <= 0).length
  }, [products])

  const totalStockInvestment = useMemo(() => {
    return products.reduce((acc, p) => acc + (Number(p.quantity) || 0) * (Number(p.cost) || 0), 0)
  }, [products])

  // Filtragem local
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Busca por nome ou descrição
      const matchesSearch =
        search === '' ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(search.toLowerCase()))

      // Categoria
      const matchesCategory = categoryFilter === 'todos' || p.category === categoryFilter

      // Status
      const qty = Number(p.quantity) || 0
      const matchesStatus =
        statusFilter === 'todos' ||
        (statusFilter === 'disponivel' && qty > 0) ||
        (statusFilter === 'esgotado' && qty <= 0)

      return matchesSearch && matchesCategory && matchesStatus
    })
  }, [products, search, categoryFilter, statusFilter])

  const handleOpenCreate = () => {
    setEditingProduct(null)
    setModalOpen(true)
  }

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p)
    setModalOpen(true)
  }

  return (
    <div className="space-y-6 animate-crystalline pb-12">
      {/* Mini-KPI cards no topo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="gem-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#6B7A70] uppercase tracking-wider">
              Total de Produtos
            </p>
            <p className="font-serif text-2xl font-bold text-[#1E3A2F] mt-1">
              <AnimatedCounter value={totalProducts} decimals={0} />
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-[#EFF3F0] text-[#3E7C4F] flex items-center justify-center">
            <Package className="h-5 w-5" />
          </div>
        </div>

        <div className="gem-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#6B7A70] uppercase tracking-wider">
              Itens Esgotados
            </p>
            <p className="font-serif text-2xl font-bold text-[#B3452F] mt-1">
              <AnimatedCounter value={outOfStockCount} decimals={0} />
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-[#F7EBEA] text-[#B3452F] flex items-center justify-center">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>

        <div className="gem-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#6B7A70] uppercase tracking-wider">
              Investimento em Estoque
            </p>
            <p className="font-serif text-2xl font-bold text-[#1E3A2F] mt-1">
              <AnimatedCounter value={totalStockInvestment} prefix="R$ " />
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-[#FAF3E0] text-[#C9A227] flex items-center justify-center">
            <CircleDollarSign className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Barra de Filtros, Busca e Ações */}
      <div className="gem-card p-4 space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Campo de Busca */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8EA598]" />
            <Input
              type="text"
              placeholder="Buscar por nome da pedra, cristal ou descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 border-[#E8E4DA] bg-white focus-visible:ring-[#C9A227] text-xs sm:text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filtro por Categoria */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-10 rounded-lg border border-[#E8E4DA] bg-white px-3 text-xs sm:text-sm text-[#1F2A24] focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
            >
              <option value="todos">Todas as Categorias</option>
              <option value="decoracao">Decoração</option>
              <option value="joia">Joias</option>
              <option value="kit">Kits</option>
              <option value="acessorio">Acessórios</option>
              <option value="base">Bases</option>
              <option value="outros">Outros</option>
            </select>

            {/* Filtro por Status */}
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as 'todos' | 'disponivel' | 'esgotado')
              }
              className="h-10 rounded-lg border border-[#E8E4DA] bg-white px-3 text-xs sm:text-sm text-[#1F2A24] focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
            >
              <option value="todos">Todos os Status</option>
              <option value="disponivel">Disponíveis</option>
              <option value="esgotado">Esgotados</option>
            </select>

            {/* Alternador de exibição */}
            <div className="flex items-center rounded-lg border border-[#E8E4DA] bg-white p-1">
              <button
                onClick={() => setViewMode('table')}
                title="Tabela"
                className={`p-1.5 rounded ${
                  viewMode === 'table' ? 'bg-[#1E3A2F] text-white' : 'text-[#6B7A70]'
                }`}
              >
                <TableIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('cards')}
                title="Cards"
                className={`p-1.5 rounded ${
                  viewMode === 'cards' ? 'bg-[#1E3A2F] text-white' : 'text-[#6B7A70]'
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>

            {/* Botão Novo Produto (apenas Admin) */}
            {isAdmin && (
              <Button
                onClick={handleOpenCreate}
                className="bg-[#C9A227] hover:bg-[#A8861D] text-white font-semibold text-xs sm:text-sm h-10 px-4 flex items-center gap-1.5 shadow"
              >
                <Plus className="h-4 w-4" />
                <span>+ Novo Produto</span>
              </Button>
            )}
          </div>
        </div>

        {/* Resumo do filtro */}
        <div className="flex items-center justify-between text-xs text-[#6B7A70] pt-1 border-t border-[#E8E4DA]/60">
          <span>
            Mostrando <strong>{filteredProducts.length}</strong> de{' '}
            <strong>{products.length}</strong> produtos
          </span>
          {(search || categoryFilter !== 'todos' || statusFilter !== 'todos') && (
            <button
              onClick={() => {
                setSearch('')
                setCategoryFilter('todos')
                setStatusFilter('todos')
              }}
              className="text-[#C9A227] hover:underline font-medium"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Conteúdo: Tabela (padrão) ou Cards */}
      {loading ? (
        <div className="flex h-48 items-center justify-center rounded-2xl border border-[#E8E4DA] bg-white">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#C9A227] border-t-transparent" />
            <p className="text-xs text-[#6B7A70]">Carregando catálogo...</p>
          </div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="gem-card p-12 text-center">
          <Gem className="h-10 w-10 text-[#C9A227] mx-auto opacity-50 mb-2" />
          <h4 className="font-serif text-lg font-bold text-[#1E3A2F]">Nenhum produto encontrado</h4>
          <p className="text-xs text-[#6B7A70] mt-1 mb-4">
            Ajuste os filtros de busca para encontrar o item desejado.
          </p>
          <Button
            onClick={() => {
              setSearch('')
              setCategoryFilter('todos')
              setStatusFilter('todos')
            }}
            variant="outline"
            className="border-[#E8E4DA] text-xs font-semibold"
          >
            Redefinir Filtros
          </Button>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="gem-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[#FAF8F3] border-b border-[#E8E4DA] text-[#6B7A70] uppercase font-semibold text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Produto</th>
                  <th className="py-3 px-3">Categoria</th>
                  <th className="py-3 px-3 text-right">Qtd</th>
                  <th className="py-3 px-3 text-right">Custo</th>
                  <th className="py-3 px-3 text-right">Venda</th>
                  <th className="py-3 px-3 text-center">Margem</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Encantamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E4DA]">
                {filteredProducts.map((p) => {
                  const isAvailable = (Number(p.quantity) || 0) > 0
                  const hasEncantamento = Boolean(p.promo_price && Number(p.promo_price) > 0)
                  const effectivePrice = hasEncantamento
                    ? Number(p.promo_price)
                    : Number(p.price) || 0
                  const cost = Number(p.cost) || 0
                  const margin =
                    effectivePrice > 0
                      ? Math.round(((effectivePrice - cost) / effectivePrice) * 100)
                      : 0

                  const catStyle = categoryStyles[p.category] || categoryStyles.outros

                  return (
                    <tr
                      key={p.id}
                      onClick={() => isAdmin && handleOpenEdit(p)}
                      className="hover:bg-[#FAF8F3] transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4">
                        <p className="font-serif font-bold text-[#1E3A2F] group-hover:text-[#3E7C4F]">
                          {p.name}
                        </p>
                        <p className="text-[11px] text-[#6B7A70] line-clamp-1">
                          {p.description || '—'}
                        </p>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="flex flex-col items-start gap-1">
                          <span
                            style={{
                              backgroundColor: catStyle.bg,
                              color: catStyle.text,
                              borderColor: catStyle.border,
                            }}
                            className="px-2 py-0.5 rounded-full text-[10px] font-semibold border inline-block"
                          >
                            {categoryLabels[p.category] || p.category}
                          </span>
                          <ProductStoneTags stones={p.stones} />
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-right font-medium text-[#1E3A2F]">
                        {p.quantity} {p.unit === 'peso' ? 'kg' : 'un.'}
                      </td>

                      <td className="py-3.5 px-3 text-right text-[#6B7A70] font-mono">
                        {formatCurrency(p.cost)}
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        {hasEncantamento ? (
                          <div className="flex flex-col items-end">
                            <span className="text-[11px] text-[#8EA598] line-through font-mono">
                              {formatCurrency(p.price)}
                            </span>
                            <span className="font-bold text-[#C9A227] font-mono">
                              {formatCurrency(Number(p.promo_price))}
                            </span>
                          </div>
                        ) : (
                          <span className="font-bold text-[#1E3A2F] font-mono">
                            {formatCurrency(p.price)}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded ${
                            margin >= 50
                              ? 'bg-[#3E7C4F]/15 text-[#3E7C4F]'
                              : margin >= 25
                                ? 'bg-[#C9A227]/20 text-[#8E7118]'
                                : 'bg-[#B3452F]/15 text-[#B3452F]'
                          }`}
                        >
                          {margin}%
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                            isAvailable
                              ? 'bg-[#EFF3F0] text-[#3E7C4F]'
                              : 'bg-[#F7EBEA] text-[#B3452F]'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isAvailable ? 'bg-[#3E7C4F]' : 'bg-[#B3452F]'
                            }`}
                          />
                          {isAvailable ? 'Disponível' : 'Esgotado'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {hasEncantamento ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF3E0] text-[#8E7118] border border-[#C9A227]/40">
                            <Sparkles className="h-3 w-3 text-[#C9A227]" />
                            <span>✦ Ativo</span>
                          </span>
                        ) : (
                          <span className="text-xs text-[#8EA598]">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* CARDS VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProducts.map((p) => {
            const isAvailable = (Number(p.quantity) || 0) > 0
            const hasEncantamento = Boolean(p.promo_price && Number(p.promo_price) > 0)
            const effectivePrice = hasEncantamento ? Number(p.promo_price) : Number(p.price) || 0
            const cost = Number(p.cost) || 0
            const margin =
              effectivePrice > 0 ? Math.round(((effectivePrice - cost) / effectivePrice) * 100) : 0

            const catStyle = categoryStyles[p.category] || categoryStyles.outros

            return (
              <div
                key={p.id}
                onClick={() => isAdmin && handleOpenEdit(p)}
                className={`gem-card p-5 gem-lift flex flex-col justify-between group ${isAdmin ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      style={{
                        backgroundColor: catStyle.bg,
                        color: catStyle.text,
                        borderColor: catStyle.border,
                      }}
                      className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold border"
                    >
                      {categoryLabels[p.category] || p.category}
                    </span>
                    <ProductStoneTags stones={p.stones} />

                    <div className="flex items-center gap-1.5">
                      {hasEncantamento && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#FAF3E0] text-[#8E7118] border border-[#C9A227]/40">
                          <Sparkles className="h-3 w-3 text-[#C9A227]" />
                          <span>✦ Encantamento</span>
                        </span>
                      )}

                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                          isAvailable
                            ? 'bg-[#EFF3F0] text-[#3E7C4F]'
                            : 'bg-[#F7EBEA] text-[#B3452F]'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isAvailable ? 'bg-[#3E7C4F]' : 'bg-[#B3452F]'
                          }`}
                        />
                        {isAvailable ? 'Disponível' : 'Esgotado'}
                      </span>
                    </div>
                  </div>

                  <h4 className="font-serif text-lg font-bold text-[#1E3A2F] group-hover:text-[#3E7C4F] transition-colors">
                    {p.name}
                  </h4>
                  <p className="text-xs text-[#6B7A70] line-clamp-2 mt-1 leading-relaxed">
                    {p.description || 'Produto natural lapidado com alto rigor estético.'}
                  </p>
                </div>

                <div className="mt-5 pt-3.5 border-t border-[#E8E4DA]/80 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#6B7A70]">Quantidade em Estoque:</span>
                    <span className="font-bold text-[#1E3A2F]">
                      {p.quantity} {p.unit === 'peso' ? 'kg' : 'un.'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#6B7A70]">Custo:</span>
                    <span className="font-medium text-[#6B7A70]">{formatCurrency(p.cost)}</span>
                  </div>

                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-xs text-[#6B7A70]">Venda:</span>
                    <div className="text-right">
                      {hasEncantamento ? (
                        <div className="flex flex-col items-end">
                          <span className="text-xs text-[#8EA598] line-through font-mono">
                            {formatCurrency(p.price)}
                          </span>
                          <span className="text-base font-bold text-[#C9A227] font-serif">
                            {formatCurrency(Number(p.promo_price))}
                          </span>
                        </div>
                      ) : (
                        <span className="text-base font-bold text-[#1E3A2F] font-serif">
                          {formatCurrency(p.price)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-[#6B7A70]">Margem de Lucro:</span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                        margin >= 50
                          ? 'bg-[#3E7C4F]/15 text-[#3E7C4F]'
                          : margin >= 25
                            ? 'bg-[#C9A227]/20 text-[#8E7118]'
                            : 'bg-[#B3452F]/15 text-[#B3452F]'
                      }`}
                    >
                      {margin}%
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal compartilhado de criação/edição */}
      <ProductModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        product={editingProduct}
        onSuccess={fetchData}
      />
    </div>
  )
}
