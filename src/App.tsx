import { lazy, Suspense } from 'react'
import { BrowserRouter, HashRouter, Link, Route, Routes } from 'react-router-dom'
import { isDemoMode } from '@/lib/supabase'
import BookingPage from '@/pages/BookingPage'
import { AuthProvider } from '@/context/AuthContext'
import { ToastProvider } from '@/context/ToastContext'
import { ProtectedRoute } from '@/components/admin/ProtectedRoute'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { PageLoader } from '@/components/ui/Spinner'

// O painel é carregado sob demanda: clientes não baixam código administrativo.
const LoginPage = lazy(() => import('@/pages/admin/LoginPage'))
const SignupPage = lazy(() => import('@/pages/admin/SignupPage'))
const DashboardPage = lazy(() => import('@/pages/admin/DashboardPage'))
const AppointmentsPage = lazy(() => import('@/pages/admin/AppointmentsPage'))
const SchedulePage = lazy(() => import('@/pages/admin/SchedulePage'))
const ServicesPage = lazy(() => import('@/pages/admin/ServicesPage'))

// O modo demonstração roda dentro de uma página hospedada sem rotas no servidor.
const Router = isDemoMode ? HashRouter : BrowserRouter

export default function App() {
  return (
    <Router>
      <ToastProvider>
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<BookingPage />} />
              <Route path="/admin/login" element={<LoginPage />} />
              <Route path="/admin/cadastro" element={<SignupPage />} />
              <Route path="/admin" element={<ProtectedRoute />}>
                <Route element={<AdminLayout />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="agendamentos" element={<AppointmentsPage />} />
                  <Route path="agenda" element={<SchedulePage />} />
                  <Route path="servicos" element={<ServicesPage />} />
                </Route>
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </ToastProvider>
    </Router>
  )
}

function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 text-center">
      <p className="font-display text-5xl text-brand-600">404</p>
      <p className="text-fg-muted">Página não encontrada.</p>
      <Link to="/" className="text-sm text-brand-600 hover:underline">Ir para o agendamento</Link>
    </div>
  )
}
