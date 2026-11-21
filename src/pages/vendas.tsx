import { ShoppingBag, Sparkles, Clock } from 'lucide-react'

export default function Vendas() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4 animate-crystalline">
      <div className="gem-card max-w-md w-full p-8 sm:p-10 flex flex-col items-center relative overflow-hidden">
        {/* Subtle decorative crystal glow */}
        <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-[#C9A227]/10 blur-2xl pointer-events-none" />
        {/* Dados reais já disponíveis na coleção `sales` do PocketBase */}

        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EFF3F0] text-[#3E7C4F] mb-5 border border-[#3E7C4F]/20 shadow-sm">
          <ShoppingBag className="h-8 w-8" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FAF3E0] text-[#8E7118] border border-[#C9A227]/30 mb-3">
          <Clock className="h-3.5 w-3.5 text-[#C9A227]" />
          <span>Módulo em Expansão</span>
        </div>

        <h3 className="font-serif text-2xl font-bold text-[#1E3A2F]">Em desenvolvimento</h3>

        <p className="text-xs sm:text-sm text-[#6B7A70] mt-2 leading-relaxed max-w-xs">
          O módulo completo de pedidos, emissão de comprovantes e frente de caixa para o atelier
          estará disponível em breve.
        </p>

        <div className="mt-6 pt-6 border-t border-[#E8E4DA] w-full flex items-center justify-center gap-2 text-[11px] text-[#8EA598]">
          <Sparkles className="h-3.5 w-3.5 text-[#C9A227]" />
          <span>Gestão Pedras & Cristais</span>
        </div>
      </div>
    </div>
  )
}
