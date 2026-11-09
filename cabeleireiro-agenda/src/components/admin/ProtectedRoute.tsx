import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { PageLoader } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { signOut } from '@/services/adminService'

export function ProtectedRoute() {
  const { session, isAdmin, loading } = useAuth()
  const location = useLocation()

  if (loading) return <PageLoader label="Verificando acesso…" />
  if (!session) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />

  if (!isAdmin) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <ShieldAlert className="size-10 text-red-700" />
        <h1 className="text-xl font-semibold">Acesso não autorizado</h1>
        <p className="max-w-sm text-sm text-fg-muted">
          Esta conta não tem permissão de administrador. Veja o tutorial do Supabase para liberar o acesso.
        </p>
        <Button variant="secondary" onClick={() => signOut()}>Sair</Button>
      </div>
    )
  }

  return <Outlet />
}
