import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Sparkles,
  TrendingUp,
  Package,
  Layers,
  CircleDollarSign,
  Plus,
  LayoutGrid,
  Table as TableIcon,
  Search,
  Gem,
  Award,
} from 'lucide-react'
import type { Product, Movement, Sale, Stone } from '@/types/database'
import { getDashboardData } from '@/services/dashboard'
import { useRealtime } from '@/hooks/use-realtime'
import { useAuth } from '@/context/AuthContext'
import { AnimatedCounter, formatCurrency } from '@/components/AnimatedCounter'
import { FinancialChart } from '@/components/FinancialChart'
import ProductModal from '@/components/ProductModal'
import { categoryLabels, categoryStyles } from '@/lib/labels'
import { ProductStoneTags } from '@/components/StoneTags'
import { useStones } from '@/hooks/useStones'
import { availableStock } from '@/services/products'
import { KitBadge } from '@/components/KitBadge'
import KitComponentsSummary from '@/components/KitComponentsSummary'
import { Button } from '@/components/ui/button'

export default function Index() {
  const { role } = useAuth()
  const isAdmin = role === 'admin'
  const { stones } = useStones()
  const [products, setProducts] = useState<Product[]>([])
  const [movements, setMovements] = useState<Movement[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)

  // Visualização de Estoque: 'cards' ou 'table'
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')

  // Modal de Produto
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  // Carrega produtos, movimentações e vendas reais do PocketBase
  const fetchData = useCallback(async () => {
    try {
      const data = await getDashboardData()
      setProducts(data.products)
      setMovements(data.movements)
      setSales(data.sales)
    } catch (err) {
      console.error('Falha ao carregar dados do dashboard:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Realtime subscriptions
  useRealtime<Product>('products', () => {
    fetchData()
  })

  useRealtime<Movement>('movements', () => {
    fetchData()
  })

  useRealtime<Sale>('sales', () => {
    fetchData()
  })

  // KPIs
  // 1. Valor total em estoque (custo) = soma(quantity * cost)
  // Kits não têm estoque próprio: seu custo já está contado nos componentes (sem dupla contagem).
  const totalStockCost = useMemo(() => {
    return products.reduce(
      (acc, p) =>
        p.product_type === 'kit' ? acc : acc + (Number(p.quantity) || 0) * (Number(p.cost) || 0),
      0,
    )
  }, [products])

  // 2. Faturamento potencial = soma(quantity * (promo_price > 0 ? promo_price : price))
  // Kits entram pelo preço dos componentes que efetivamente saem do estoque na venda.
  const potentialRevenue = useMemo(() => {
    return products.reduce((acc, p) => {
      if (p.product_type === 'kit') return acc
      const effectivePrice =
        p.promo_price && Number(p.promo_price) > 0 ? Number(p.promo_price) : Number(p.price) || 0
      return acc + (Number(p.quantity) || 0) * effectivePrice
    }, 0)
  }, [products])

  // 3. Lucro bruto estimado = faturamento potencial - valor total em estoque
  const estimatedGrossProfit = useMemo(() => {
    return Math.max(potentialRevenue - totalStockCost, 0)
  }, [potentialRevenue, totalStockCost])

  // Mapa id → Stone para as tags de pedra nos cards/tabela do dashboard
  const stoneMap = useMemo(() => {
    const map: Record<string, Stone> = {}
    for (const s of stones) map[s.id] = s
    return map
  }, [stones])

  // Mapa id → Product para resolver componentes de kits (resumo + estoque)
  const productsIndex = useMemo(() => {
    const map: Record<string, Product> = {}
    for (const p of products) map[p.id] = p
    return map
  }, [products])

  // 4. Caixa atual = soma(entradas) - soma(saidas) + vendas reais registradas
  const currentCash = useMemo(() => {
    const salesTotal = sales.reduce((acc, s) => acc + (Number(s.total) || 0), 0)
    return movements.reduce((acc, m) => {
      if (m.type === 'entrada') return acc + (Number(m.amount) || 0)
      if (m.type === 'saida') return acc - (Number(m.amount) || 0)
      return acc
    }, salesTotal)
  }, [movements, sales])

  // Destaque do Dia: produto com maior margem de lucro com estoque > 0
  const highlightProduct = useMemo(() => {
    const available = products.filter((p) => availableStock(p, productsIndex) > 0)
    if (available.length === 0) return products[0] || null

    let best = available[0]
    let bestMargin = -1

    available.forEach((p) => {
      const cost = Number(p.cost) || 0
      const effectivePrice =
        p.promo_price && Number(p.promo_price) > 0 ? Number(p.promo_price) : Number(p.price) || 0
      if (effectivePrice > 0) {
        const margin = (effectivePrice - cost) / effectivePrice
        if (margin > bestMargin) {
          bestMargin = margin
          best = p
        }
      }
    })

    return best
  }, [products])

  const totalItemsCount = useMemo(() => {
    return products.reduce((acc, p) => acc + (Number(p.quantity) || 0), 0)
  }, [products])

  const handleOpenCreate = () => {
    setEditingProduct(null)
    setModalOpen(true)
  }

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p)
    setModalOpen(true)
  }

  return (
    <div className="space-y-8 animate-crystalline pb-12">
      {/* ========================================================= */}
      {/* 1. FINANCIAL SUMMARY AREA (TOP) */}
      {/* ========================================================= */}
      <section className="space-y-6">
        {/* 4 KPI Cards in a row (2x2 tablet, 1x mobile) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* KPI 1: Valor total em estoque (custo) */}
          <div className="gem-card p-5 relative overflow-hidden flex flex-col justify-between gem-lift">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-[#6B7A70] uppercase tracking-wider">
                  Valor em Estoque (Custo)
                </span>
                <div className="mt-2 text-2xl font-serif font-bold text-[#1E3A2F]">
                  <AnimatedCounter value={totalStockCost} prefix="R$ " />
                </div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FAF3E0] text-[#C9A227]">
                <Package className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-[#6B7A70] border-t border-[#E8E4DA]/60 pt-2.5">
              <span>{products.length} produtos cadastrados</span>
              <span className="font-medium text-[#1E3A2F]">{totalItemsCount} un./kg</span>
            </div>
          </div>

          {/* KPI 2: Faturamento Potencial */}
          <div className="gem-card p-5 relative overflow-hidden flex flex-col justify-between gem-lift">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-[#6B7A70] uppercase tracking-wider">
                  Faturamento Potencial
                </span>
                <div className="mt-2 text-2xl font-serif font-bold text-[#1E3A2F]">
                  <AnimatedCounter value={potentialRevenue} prefix="R$ " />
                </div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EFF3F0] text-[#3E7C4F]">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-[#6B7A70] border-t border-[#E8E4DA]/60 pt-2.5">
              <span>Preço de venda estimado</span>
              <span className="font-medium text-[#3E7C4F]">Com encantamentos</span>
            </div>
          </div>

          {/* KPI 3: Lucro Bruto Estimado */}
          <div className="gem-card p-5 relative overflow-hidden flex flex-col justify-between gem-lift">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-[#6B7A70] uppercase tracking-wider">
                  Lucro Bruto Estimado
                </span>
                <div className="mt-2 text-2xl font-serif font-bold text-[#3E7C4F]">
                  <AnimatedCounter value={estimatedGrossProfit} prefix="R$ " />
                </div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EFF3F0] text-[#3E7C4F]">
                <Layers className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-[#6B7A70] border-t border-[#E8E4DA]/60 pt-2.5">
              <span>Margem média do atelier</span>
              <span className="font-semibold text-[#3E7C4F]">
                {potentialRevenue > 0
                  ? Math.round((estimatedGrossProfit / potentialRevenue) * 100)
                  : 0}
                %
              </span>
            </div>
          </div>

          {/* KPI 4: Caixa Atual */}
          <div className="gem-card p-5 relative overflow-hidden flex flex-col justify-between gem-lift">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-[#6B7A70] uppercase tracking-wider">
                  Caixa Atual
                </span>
                <div className="mt-2 text-2xl font-serif font-bold text-[#C9A227]">
                  <AnimatedCounter value={currentCash} prefix="R$ " />
                </div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FAF3E0] text-[#C9A227]">
                <CircleDollarSign className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-[#6B7A70] border-t border-[#E8E4DA]/60 pt-2.5">
              <span>Saldo apurado</span>
              <span className="font-semibold text-[#C9A227]">Últimos 7 dias</span>
            </div>
          </div>
        </div>

        {/* 7-Day Chart & "Destaque do Dia" Side Card (Desktop 2/3 + 1/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* 7-day Bar Chart (2/3 desktop) */}
          <div className="lg:col-span-2 gem-card p-6">
            <FinancialChart movements={movements} />
          </div>

          {/* Destaque do dia (1/3 desktop) */}
          <div className="gem-card p-6 flex flex-col justify-between bg-gradient-to-br from-white via-[#FAF8F3] to-[#FAF3E0]/40 border-[#E8E4DA]">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FAF3E0] text-[#C9A227] border border-[#C9A227]/30">
                  <Award className="h-3.5 w-3.5" />
                  <span>Destaque do Atelier</span>
                </span>
                <span className="text-[11px] text-[#6B7A70]">Maior Margem</span>
              </div>

              {highlightProduct ? (
                <div className="space-y-3">
                  <h4 className="font-serif text-xl font-bold text-[#1E3A2F]">
                    {highlightProduct.name}
                  </h4>
                  <p className="text-xs text-[#6B7A70] line-clamp-2 leading-relaxed">
                    {highlightProduct.description ||
                      'Gema selecionada com alto potencial de rentabilidade e valor estético.'}
                  </p>

                  <div className="pt-2 flex items-center gap-2">
                    <span
                      style={{
                        backgroundColor: categoryStyles[highlightProduct.category]?.bg,
                        color: categoryStyles[highlightProduct.category]?.text,
                        borderColor: categoryStyles[highlightProduct.category]?.border,
                      }}
                      className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold border"
                    >
                      {categoryLabels[highlightProduct.category]}
                    </span>
                    <span className="text-xs text-[#6B7A70]">
                      Estoque:{' '}
                      <strong>
                        {highlightProduct.quantity}{' '}
                        {highlightProduct.unit === 'peso' ? 'kg' : 'un.'}
                      </strong>
                    </span>
                  </div>

                  <div className="mt-4 p-3 rounded-xl bg-white border border-[#E8E4DA] space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#6B7A70]">Custo de Aquisição:</span>
                      <span className="font-medium text-[#1E3A2F]">
                        {formatCurrency(highlightProduct.cost)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-[#6B7A70]">Preço de Venda:</span>
                      <span className="font-bold text-[#3E7C4F]">
                        {formatCurrency(
                          highlightProduct.promo_price && highlightProduct.promo_price > 0
                            ? highlightProduct.promo_price
                            : highlightProduct.price,
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#6B7A70]">Nenhum produto cadastrado no momento.</p>
              )}
            </div>

            {highlightProduct && (
              <div className="pt-4 mt-4 border-t border-[#E8E4DA]/60">
                <Button
                  onClick={() => isAdmin && handleOpenEdit(highlightProduct)}
                  variant="outline"
                  className="w-full text-xs font-semibold border-[#C9A227] text-[#8E7118] hover:bg-[#FAF3E0]"
                >
                  Ver Detalhes do Produto
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 2. STOCK AREA (BELOW FINANCIAL AREA) */}
      {/* ========================================================= */}
      <section className="space-y-5 pt-4">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E4DA] pb-4">
          <div>
            <h3 className="font-serif text-2xl font-bold text-[#1E3A2F] flex items-center gap-2">
              <Gem className="h-6 w-6 text-[#C9A227]" />
              <span>Estoque do Atelier</span>
            </h3>
            <p className="text-xs text-[#6B7A70] mt-0.5">
              Controle de pedras, quartzos, geodos, joias e artigos decorativos
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle: Card vs Table */}
            <div className="flex items-center rounded-lg border border-[#E8E4DA] bg-white p-1">
              <button
                onClick={() => setViewMode('cards')}
                title="Visualização em Cards"
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                  viewMode === 'cards'
                    ? 'bg-[#1E3A2F] text-white shadow-sm'
                    : 'text-[#6B7A70] hover:text-[#1E3A2F]'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Cards</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                title="Visualização em Tabela"
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                  viewMode === 'table'
                    ? 'bg-[#1E3A2F] text-white shadow-sm'
                    : 'text-[#6B7A70] hover:text-[#1E3A2F]'
                }`}
              >
                <TableIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Tabela</span>
              </button>
            </div>

            {/* + Novo Produto Button (Gold) — apenas Admin */}
            {isAdmin && (
              <Button
                onClick={handleOpenCreate}
                className="bg-[#C9A227] hover:bg-[#A8861D] text-white font-semibold text-xs sm:text-sm px-4 h-10 shadow-md transition flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" />
                <span>Novo Produto</span>
              </Button>
            )}
          </div>
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="flex h-48 items-center justify-center rounded-2xl border border-[#E8E4DA] bg-white">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#C9A227] border-t-transparent" />
              <p className="text-xs text-[#6B7A70]">Carregando estoque...</p>
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center gem-card">
            <Gem className="h-12 w-12 text-[#C9A227] opacity-60 mb-3" />
            <h4 className="font-serif text-lg font-bold text-[#1E3A2F]">
              Nenhum produto em estoque
            </h4>
            <p className="text-xs text-[#6B7A70] max-w-sm mt-1 mb-4">
              Comece adicionando pedras naturais, joias ou artigos decorativos ao seu atelier.
            </p>
            {isAdmin && (
              <Button
                onClick={handleOpenCreate}
                className="bg-[#C9A227] hover:bg-[#A8861D] text-white font-semibold"
              >
                + Adicionar Primeiro Produto
              </Button>
            )}
          </div>
        ) : viewMode === 'cards' ? (
          /* CARD VIEW: Responsive Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {products.map((p) => {
              const isAvailable = (Number(p.quantity) || 0) > 0
              const hasEncantamento = Boolean(p.promo_price && Number(p.promo_price) > 0)
              const effectivePrice = hasEncantamento ? Number(p.promo_price) : Number(p.price) || 0
              const cost = Number(p.cost) || 0
              const margin =
                effectivePrice > 0
                  ? Math.round(((effectivePrice - cost) / effectivePrice) * 100)
                  : 0

              const catStyle = categoryStyles[p.category] || categoryStyles.outros

              return (
                <div
                  key={p.id}
                  onClick={() => handleOpenEdit(p)}
                  className="gem-card p-5 cursor-pointer gem-lift flex flex-col justify-between group relative overflow-hidden"
                >
                  {/* Top: Category + Availability Indicator + Encantamento Badge */}
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

                      <div className="flex items-center gap-1.5">
                        {hasEncantamento && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#FAF3E0] text-[#8E7118] border border-[#C9A227]/40 shadow-xs">
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

                    {/* Stone Name & Description */}
                    <h4 className="font-serif text-lg font-bold text-[#1E3A2F] group-hover:text-[#3E7C4F] transition-colors">
                      {p.name}
                    </h4>
                    <p className="text-xs text-[#6B7A70] line-clamp-2 mt-1 leading-relaxed">
                      {p.description || 'Produto natural lapidado com alto rigor estético.'}
                    </p>
                    <div className="mt-2">
                      <ProductStoneTags stones={p.stones} stonesIndex={stoneMap} />
                    </div>
                  </div>

                  {/* Quantity & Pricing Block */}
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

                    {/* Profit Margin Chip */}
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
        ) : (
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
                  {products.map((p) => {
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
                          <ProductStoneTags stones={p.stones} stonesIndex={stoneMap} />
                        </td>

                        <td className="py-3.5 px-3">
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
        )}
      </section>

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
