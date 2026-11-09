import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarCheck, CalendarClock, Hourglass, RefreshCw, Sun } from 'lucide-react'
import type { Appointment } from '@/types'
import { fetchAppointments } from '@/services/adminService'
import { toAppError } from '@/lib/errors'
import { formatDateShort, todayIn } from '@/lib/format'
import { PageHeader } from '@/components/admin/AdminLayout'
import { AppointmentCard } from '@/components/admin/AppointmentCard'
import { useAppointmentActions } from '@/hooks/useAppointmentActions'
import { Alert, EmptyState } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { PageLoader } from '@/components/ui/Spinner'

export default function DashboardPage() {
  const [items, setItems] = useState<Appointment[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const today = todayIn()

  const load = useCallback(async () => {
    setRefreshing(true)
    try {
      // Todos os agendamentos ativos de hoje em diante.
      setItems(await fetchAppointments({ from: today, status: ['pending', 'confirmed'] }))
      setError(null)
    } catch (e) {
      setError(toAppError(e).message)
    } finally {
      setRefreshing(false)
    }
  }, [today])

  useEffect(() => { load() }, [load])
  const { request, modal, busy } = useAppointmentActions(load)

  if (!items && !error) return <PageLoader />

  const list = items ?? []
  const todays = list.filter((a) => a.appointment_date === today)
  const pending = list.filter((a) => a.status === 'pending')
  const confirmed = list.filter((a) => a.status === 'confirmed')
  const nowTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())
  const upcoming = confirmed
    .filter((a) => a.appointment_date > today || a.end_time.slice(0, 5) > nowTime)
    .slice(0, 5)

  const stats = [
    { label: 'Hoje', value: todays.length, icon: Sun, hint: 'pendentes + confirmados' },
    { label: 'Pendentes', value: pending.length, icon: Hourglass, hint: 'aguardando sua resposta' },
    { label: 'Confirmados', value: confirmed.length, icon: CalendarCheck, hint: 'de hoje em diante' },
    { label: 'Próximos', value: upcoming.length ? upcoming[0].start_time.slice(0, 5) : '—', icon: CalendarClock, hint: upcoming.length ? `próximo · ${upcoming[0].appointment_date === today ? 'hoje' : formatDateShort(upcoming[0].appointment_date)}` : 'nenhum agendado' },
  ]

  return (
    <>
      <PageHeader
        title="Visão geral"
        subtitle="Resumo da sua agenda."
        actions={<Button variant="secondary" size="sm" onClick={load} loading={refreshing} icon={<RefreshCw className="size-4" />}>Atualizar</Button>}
      />
      {error && <Alert tone="error" className="mb-6">{error}</Alert>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, hint }) => (
          <div key={label} className="rounded-2xl border border-line bg-surface p-4 animate-fade-in sm:p-5">
            <div className="flex items-center justify-between text-fg-muted">
              <span className="text-sm font-medium">{label}</span>
              <span className="flex size-8 items-center justify-center rounded-full bg-sun-100 text-brand-700">
                <Icon className="size-4" />
              </span>
            </div>
            <p className="mt-2 font-display text-4xl font-bold tabular-nums">{value}</p>
            <p className="mt-1 text-xs text-fg-muted">{hint}</p>
          </div>
        ))}
      </div>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Solicitações pendentes</h2>
          {pending.length > 0 && <Link to="/admin/agendamentos" className="text-sm text-brand-600 hover:underline">Ver todas</Link>}
        </div>
        {pending.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {pending.map((a) => <AppointmentCard key={a.id} appointment={a} onAction={request} busy={busy} />)}
          </div>
        ) : (
          <EmptyState icon={<Hourglass className="size-6" />} title="Nenhuma solicitação pendente" />
        )}
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold">Próximos atendimentos</h2>
        {upcoming.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {upcoming.map((a) => <AppointmentCard key={a.id} appointment={a} onAction={request} busy={busy} />)}
          </div>
        ) : (
          <EmptyState icon={<CalendarClock className="size-6" />} title="Nenhum atendimento confirmado à frente" />
        )}
      </section>
      {modal}
    </>
  )
}
