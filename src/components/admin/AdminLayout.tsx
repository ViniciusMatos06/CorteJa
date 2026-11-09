import { Link, NavLink, Outlet } from 'react-router-dom'
import { CalendarCog, CalendarDays, LayoutDashboard, LogOut, Scissors, ExternalLink } from 'lucide-react'
import { signOut } from '@/services/adminService'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/components/ui/cn'

const NAV = [
  { to: '/admin', label: 'Painel', icon: LayoutDashboard, end: true },
  { to: '/admin/agendamentos', label: 'Agendamentos', icon: CalendarDays },
  { to: '/admin/agenda', label: 'Agenda', icon: CalendarCog },
  { to: '/admin/servicos', label: 'Serviços', icon: Scissors },
]

export function AdminLayout() {
  const { session } = useAuth()

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[240px_1fr]">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-dvh flex-col bg-brand-900 p-4 text-white md:flex">
        <div className="mb-8 flex items-center gap-2.5 px-2 pt-2">
          <span className="flex size-9 items-center justify-center rounded-full bg-sun-400 text-brand-900">
            <Scissors className="size-4" />
          </span>
          <span className="font-display text-lg font-semibold">Minha agenda</span>
        </div>
        <nav className="flex-1 space-y-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
                  isActive ? 'bg-white/12 font-semibold text-white shadow-[inset_3px_0_0_var(--color-sun-400)]' : 'text-brand-100 hover:bg-white/6 hover:text-white',
                )
              }
            >
              <Icon className="size-4" /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-1 border-t border-white/10 pt-4">
          <Link to="/" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-brand-100 hover:text-white">
            <ExternalLink className="size-4" /> Página de agendamento
          </Link>
          <p className="truncate px-3 pt-2 text-xs text-brand-100/60">{session?.user.email}</p>
          <button onClick={() => signOut()} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-brand-100 hover:bg-white/6 hover:text-white">
            <LogOut className="size-4" /> Sair
          </button>
        </div>
      </aside>

      {/* Topo (mobile) */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-brand-900 px-4 py-3 text-white md:hidden">
        <span className="flex items-center gap-2 font-display font-semibold">
          <Scissors className="size-4 text-sun-400" /> Minha agenda
        </span>
        <button onClick={() => signOut()} className="rounded-lg p-2 text-brand-100" aria-label="Sair">
          <LogOut className="size-4" />
        </button>
      </header>

      <main className="min-w-0 px-4 pt-6 pb-28 sm:px-6 md:px-10 md:pt-10 md:pb-12">
        <div className="mx-auto max-w-5xl">
          <Outlet />
        </div>
      </main>

      {/* Navegação inferior (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn('flex flex-col items-center gap-1 py-2.5 text-[11px]', isActive ? 'font-semibold text-brand-700' : 'text-fg-muted')
            }
          >
            <Icon className="size-5" /> {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-fg-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  )
}
