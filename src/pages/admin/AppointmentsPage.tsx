import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, Inbox, List, RefreshCw } from 'lucide-react'
import type { Appointment, AppointmentStatus } from '@/types'
import { fetchAppointments } from '@/services/adminService'
import { toAppError } from '@/lib/errors'
import { addDays, formatDateLong, parseISODate, todayIn } from '@/lib/format'
import { PageHeader } from '@/components/admin/AdminLayout'
import { AppointmentCard } from '@/components/admin/AppointmentCard'
import { useAppointmentActions } from '@/hooks/useAppointmentActions'
import { Alert, EmptyState } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { STATUS_LABEL } from '@/components/ui/StatusBadge'
import { MonthCalendar, monthBounds, type MonthRef } from '@/components/ui/MonthCalendar'
import { cn } from '@/components/ui/cn'

type View = 'list' | 'calendar'
type Period = 'upcoming' | 'past'
const STATUSES: AppointmentStatus[] = ['pending', 'confirmed', 'declined', 'cancelled']

export default function AppointmentsPage() {
  const today = todayIn()
  const [view, setView] = useState<View>('list')
  const [period, setPeriod] = useState<Period>('upcoming')
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | 'all'>('all')
  const [month, setMonth] = useState<MonthRef>(() => {
    const d = parseISODate(today)
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const [selectedDay, setSelectedDay] = useState<string>(today)

  const [items, setItems] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      let data: Appointment[]
      if (view === 'calendar') {
        const { first, last } = monthBounds(month)
        data = await fetchAppointments({ from: first, to: last })
      } else if (period === 'upcoming') {
        data = await fetchAppointments({ from: today })
      } else {
        data = (await fetchAppointments({ to: addDays(today, -1), from: addDays(today, -180) })).reverse()
      }
      setItems(data)
      setError(null)
    } catch (e) {
      setError(toAppError(e).message)
    } finally {
      setLoading(false)
    }
  }, [view, month, period, today])

  useEffect(() => { load() }, [load])
  const { request, modal, busy } = useAppointmentActions(load)

  const filtered = useMemo(
    () => (statusFilter === 'all' ? items : items.filter((a) => a.status === statusFilter)),
    [items, statusFilter],
  )

  // Agrupa por data para a lista
  const groups = useMemo(() => {
    const map = new Map<string, Appointment[]>()
    for (const a of filtered) map.set(a.appointment_date, [...(map.get(a.appointment_date) ?? []), a])
    return [...map.entries()]
  }, [filtered])

  const countByDay = useMemo(() => {
    const map = new Map<string, { active: number; pending: number }>()
    for (const a of items) {
      if (a.status !== 'pending' && a.status !== 'confirmed') continue
      const c = map.get(a.appointment_date) ?? { active: 0, pending: 0 }
      c.active++
      if (a.status === 'pending') c.pending++
      map.set(a.appointment_date, c)
    }
    return map
  }, [items])

  const dayItems = filtered.filter((a) => a.appointment_date === selectedDay)

  return (
    <>
      <PageHeader
        title="Agendamentos"
        subtitle="Aprove, recuse ou cancele atendimentos."
        actions={
          <>
            <div className="flex rounded-xl border border-line-strong bg-surface p-1">
              {([['list', List, 'Lista'], ['calendar', CalendarDays, 'Calendário']] as const).map(([v, Icon, label]) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors', view === v ? 'bg-tint text-fg' : 'text-fg-muted hover:text-fg')}
                >
                  <Icon className="size-4" /> {label}
                </button>
              ))}
            </div>
            <Button variant="secondary" size="sm" className="h-10" onClick={load} aria-label="Atualizar" icon={<RefreshCw className="size-4" />} />
          </>
        }
      />

      {/* Filtros */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {view === 'list' && (
          <>
            {(['upcoming', 'past'] as const).map((p) => (
              <Chip key={p} active={period === p} onClick={() => setPeriod(p)}>
                {p === 'upcoming' ? 'Próximos' : 'Anteriores'}
              </Chip>
            ))}
            <span className="mx-1 h-5 w-px bg-tint" />
          </>
        )}
        <Chip active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>Todos</Chip>
        {STATUSES.map((s) => (
          <Chip key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>{STATUS_LABEL[s]}</Chip>
        ))}
        {loading && <Spinner className="ml-2 size-4 text-brand-600" />}
      </div>

      {error && <Alert tone="error" className="mb-6">{error}</Alert>}

      {view === 'list' ? (
        groups.length ? (
          <div className="space-y-8">
            {groups.map(([date, list]) => (
              <section key={date}>
                <h2 className="mb-3 text-sm font-medium text-fg-muted first-letter:uppercase">
                  {date === today ? 'Hoje · ' : ''}{formatDateLong(date)}
                </h2>
                <div className="grid gap-3 lg:grid-cols-2">
                  {list.map((a) => <AppointmentCard key={a.id} appointment={a} onAction={request} busy={busy} />)}
                </div>
              </section>
            ))}
          </div>
        ) : (
          !loading && <EmptyState icon={<Inbox className="size-6" />} title="Nenhum agendamento encontrado" />
        )
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
          <Card className="h-fit">
            <MonthCalendar
              month={month}
              onMonthChange={setMonth}
              selected={selectedDay}
              onSelect={setSelectedDay}
              today={today}
              loading={loading}
              renderMarker={(iso) => {
                const c = countByDay.get(iso)
                if (!c) return null
                return (
                  <span className="absolute bottom-1 flex gap-0.5">
                    {Array.from({ length: Math.min(c.active, 4) }, (_, i) => (
                      <span key={i} className={cn('size-1 rounded-full', i < c.pending ? 'bg-sun-400' : 'bg-brand-600')} />
                    ))}
                  </span>
                )
              }}
            />
            <div className="mt-4 flex gap-4 text-xs text-fg-muted">
              <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-sun-400" /> Pendente</span>
              <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-brand-600" /> Confirmado</span>
            </div>
          </Card>
          <div>
            <h2 className="mb-3 text-sm font-medium text-fg-muted first-letter:uppercase">{formatDateLong(selectedDay)}</h2>
            {dayItems.length ? (
              <div className="space-y-3">
                {dayItems.map((a) => <AppointmentCard key={a.id} appointment={a} onAction={request} busy={busy} />)}
              </div>
            ) : (
              <EmptyState icon={<CalendarDays className="size-6" />} title="Nenhum agendamento neste dia" />
            )}
          </div>
        </div>
      )}
      {modal}
    </>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full border px-3.5 py-1.5 text-sm transition-colors',
        active ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-line-strong text-fg-muted hover:text-fg',
      )}
    >
      {children}
    </button>
  )
}
