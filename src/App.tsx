import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/context/AuthContext'
import Layout from './components/Layout'

// Páginas Autenticadas
import Index from './pages/Index'
import Produtos from './pages/produtos'
import Vendas from './pages/vendas'
import Financeiro from './pages/financeiro'
import Configuracoes from './pages/configuracoes'

// Páginas Públicas de Autenticação
import Entrar from './pages/entrar'
import CriarConta from './pages/criar-conta'
import RecuperarSenha from './pages/recuperar-senha'
import RedefinirSenha from './pages/redefinir-senha'
import VerificarEmail from './pages/verificar-email'
import ConfirmarEmail from './pages/confirmar-email'
import NotFound from './pages/NotFound'

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          {/* Rotas Públicas */}
          <Route path="/entrar" element={<Entrar />} />
          <Route path="/criar-conta" element={<CriarConta />} />
          <Route path="/recuperar-senha" element={<RecuperarSenha />} />
          <Route path="/redefinir-senha" element={<RedefinirSenha />} />
          <Route path="/verificar-email" element={<VerificarEmail />} />
          <Route path="/confirmar-email" element={<ConfirmarEmail />} />

          {/* Rotas Protegidas dentro do Layout Global */}
          <Route element={<Layout />}>
            <Route path="/" element={<Index />} />
            <Route path="/produtos" element={<Produtos />} />
            <Route path="/vendas" element={<Vendas />} />
            <Route path="/financeiro" element={<Financeiro />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
