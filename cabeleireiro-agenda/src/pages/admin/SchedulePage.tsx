import { useEffect, useState, type FormEvent } from 'react'
import { Ban, Coffee, Plus, Save, Trash2 } from 'lucide-react'
import type { BlockedSlot, BreakRule, BusinessSettings } from '@/types'
import {
  createBlock, createBreak, deleteBlock, deleteBreak, fetchBlocks, fetchBreaks, fetchSettings, saveSettings,
} from '@/services/adminService'
import { useToast } from '@/context/ToastContext'
import { toAppError } from '@/lib/errors'
import { WEEKDAYS_LONG, WEEKDAYS_SHORT, formatDateLong, hhmm, todayIn } from '@/lib/format'
import { PageHeader } from '@/components/admin/AdminLayout'
import { Alert, EmptyState } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card, SectionTitle } from '@/components/ui/Card'
import { Input, Select } from '@/components/ui/Field'
import { PageLoader } from '@/components/ui/Spinner'
import { cn } from '@/components/ui/cn'

export default function SchedulePage() {
  const [settings, setSettings] = useState<BusinessSettings | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSettings().then(setSettings).catch((e) => setError(toAppError(e).message))
  }, [])

  return (
    <>
      <PageHeader title="Agenda" subtitle="Defina quando você atende. Mudanças valem para novas solicitações." />
      {error && <Alert tone="error">{error}</Alert>}
      {!settings && !error && <PageLoader />}
      {settings && (
        <div className="space-y-6">
          <SettingsForm initial={settings} />
          <div className="grid gap-6 lg:grid-cols-2">
            <BreaksSection />
            <BlocksSection />
          </div>
        </div>
      )}
    </>
  )
}

// ----------------------------------------------------------------------------

function SettingsForm({ initial }: { initial: BusinessSettings }) {
  const toast = useToast()
  const [form, setForm] = useState({
    business_name: initial.business_name,
    work_days: initial.work_days,
    day_start: hhmm(initial.day_start),
    day_end: hhmm(initial.day_end),
    slot_minutes: initial.slot_minutes,
    min_notice_minutes: initial.min_notice_minutes,
    booking_window_days: initial.booking_window_days,
  })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const toggleDay = (d: number) =>
    setForm((f) => ({
      ...f,
      work_days: f.work_days.includes(d) ? f.work_days.filter((x) => x !== d) : [...f.work_days, d].sort(),
    }))

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (form.business_name.trim().length < 2) return setFormError('Informe o nome do negócio.')
    if (!form.day_start || !form.day_end || form.day_end <= form.day_start)
      return setFormError('O encerramento deve ser depois do início do expediente.')
    if (form.slot_minutes < 15 || form.slot_minutes > 240)
      return setFormError('A duração do atendimento deve ficar entre 15 e 240 minutos.')
    if (form.booking_window_days < 1 || form.booking_window_days > 120)
      return setFormError('A antecedência máxima deve ficar entre 1 e 120 dias.')

    setSaving(true)
    try {
      await saveSettings({ ...form, business_name: form.business_name.trim() })
      toast.success('Configurações salvas.')
    } catch (err) {
      setFormError(toAppError(err).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <SectionTitle title="Expediente" subtitle="Dias, horários e duração padrão dos atendimentos." />

        <Input
          label="Nome exibido na página de agendamento"
          value={form.business_name}
          maxLength={80}
          onChange={(e) => setForm({ ...form, business_name: e.target.value })}
        />

        <div>
          <p className="mb-2 text-sm font-medium text-fg-soft">Dias de atendimento</p>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS_SHORT.map((label, d) => {
              const on = form.work_days.includes(d)
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleDay(d)}
                  className={cn(
                    'h-10 min-w-14 rounded-xl border px-3 text-sm font-medium transition-colors',
                    on ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-line-strong bg-surface text-fg-muted hover:text-fg',
                  )}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Input label="Início" type="time" value={form.day_start} onChange={(e) => setForm({ ...form, day_start: e.target.value })} />
          <Input label="Encerramento" type="time" value={form.day_end} onChange={(e) => setForm({ ...form, day_end: e.target.value })} />
          <Input
            label="Duração (min)"
            type="number" min={15} max={240} step={5}
            value={form.slot_minutes}
            onChange={(e) => setForm({ ...form, slot_minutes: Number(e.target.value) })}
          />
          <Select
            label="Antecedência mínima"
            value={form.min_notice_minutes}
            onChange={(e) => setForm({ ...form, min_notice_minutes: Number(e.target.value) })}
          >
            {[0, 30, 60, 120, 180, 360, 720, 1440].map((m) => (
              <option key={m} value={m}>{m === 0 ? 'Nenhuma' : m < 60 ? `${m} min` : `${m / 60} h`}</option>
            ))}
          </Select>
          <Input
            label="Agendar até (dias)"
            type="number" min={1} max={120}
            value={form.booking_window_days}
            onChange={(e) => setForm({ ...form, booking_window_days: Number(e.target.value) })}
          />
        </div>

        {formError && <Alert tone="error">{formError}</Alert>}
        <div className="flex justify-end">
          <Button type="submit" loading={saving} icon={<Save className="size-4" />}>Salvar configurações</Button>
        </div>
      </form>
    </Card>
  )
}

// ----------------------------------------------------------------------------

function BreaksSection() {
  const toast = useToast()
  const [items, setItems] = useState<BreakRule[] | null>(null)
  const [form, setForm] = useState({ label: 'Almoço', weekday: '', start_time: '12:00', end_time: '13:00' })
  const [saving, setSaving] = useState(false)

  const load = () => fetchBreaks().then(setItems).catch((e) => toast.error(toAppError(e).message))
  useEffect(() => { load() }, [])

  async function add(e: FormEvent) {
    e.preventDefault()
    if (form.end_time <= form.start_time) return toast.error('O fim do intervalo deve ser depois do início.')
    setSaving(true)
    try {
      await createBreak({
        label: form.label.trim() || 'Intervalo',
        weekday: form.weekday === '' ? null : Number(form.weekday),
        start_time: form.start_time,
        end_time: form.end_time,
      })
      toast.success('Intervalo adicionado.')
      await load()
    } catch (err) {
      toast.error(toAppError(err).message)
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    try {
      await deleteBreak(id)
      setItems((list) => list?.filter((x) => x.id !== id) ?? null)
      toast.success('Intervalo removido.')
    } catch (err) {
      toast.error(toAppError(err).message)
    }
  }

  return (
    <Card>
      <SectionTitle title="Intervalos" subtitle="Almoço e pausas que se repetem toda semana." />
      <form onSubmit={add} className="grid gap-3 sm:grid-cols-2">
        <Input label="Descrição" value={form.label} maxLength={60} onChange={(e) => setForm({ ...form, label: e.target.value })} />
        <Select label="Dia" value={form.weekday} onChange={(e) => setForm({ ...form, weekday: e.target.value })}>
          <option value="">Todos os dias</option>
          {WEEKDAYS_LONG.map((d, i) => <option key={d} value={i}>{d}</option>)}
        </Select>
        <Input label="Início" type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
        <Input label="Fim" type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
        <Button type="submit" variant="secondary" loading={saving} icon={<Plus className="size-4" />} className="sm:col-span-2">
          Adicionar intervalo
        </Button>
      </form>

      <div className="mt-5 space-y-2">
        {items === null ? null : items.length ? (
          items.map((b) => (
            <Row key={b.id} onDelete={() => remove(b.id)}>
              <Coffee className="size-4 text-brand-600" />
              <span className="font-medium">{b.label}</span>
              <span className="text-fg-muted">
                {b.weekday == null ? 'Todos os dias' : WEEKDAYS_LONG[b.weekday]} · {hhmm(b.start_time)}–{hhmm(b.end_time)}
              </span>
            </Row>
          ))
        ) : (
          <EmptyState title="Nenhum intervalo cadastrado" />
        )}
      </div>
    </Card>
  )
}

// ----------------------------------------------------------------------------

function BlocksSection() {
  const toast = useToast()
  const today = todayIn()
  const [items, setItems] = useState<BlockedSlot[] | null>(null)
  const [form, setForm] = useState({ block_date: today, fullDay: true, start_time: '09:00', end_time: '12:00', reason: '' })
  const [saving, setSaving] = useState(false)

  const load = () => fetchBlocks(today).then(setItems).catch((e) => toast.error(toAppError(e).message))
  useEffect(() => { load() }, [])

  async function add(e: FormEvent) {
    e.preventDefault()
    if (!form.block_date || form.block_date < today) return toast.error('Escolha uma data de hoje em diante.')
    if (!form.fullDay && form.end_time <= form.start_time) return toast.error('O fim do bloqueio deve ser depois do início.')
    setSaving(true)
    try {
      await createBlock({
        block_date: form.block_date,
        start_time: form.fullDay ? null : form.start_time,
        end_time: form.fullDay ? null : form.end_time,
        reason: form.reason.trim() || null,
      })
      toast.success('Bloqueio criado. Os horários afetados não aparecem mais para clientes.')
      setForm((f) => ({ ...f, reason: '' }))
      await load()
    } catch (err) {
      toast.error(toAppError(err).message)
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    try {
      await deleteBlock(id)
      setItems((list) => list?.filter((x) => x.id !== id) ?? null)
      toast.success('Bloqueio removido.')
    } catch (err) {
      toast.error(toAppError(err).message)
    }
  }

  return (
    <Card>
      <SectionTitle title="Bloqueios" subtitle="Folgas, compromissos ou horários específicos indisponíveis." />
      <form onSubmit={add} className="grid gap-3 sm:grid-cols-2">
        <Input label="Data" type="date" min={today} value={form.block_date} onChange={(e) => setForm({ ...form, block_date: e.target.value })} />
        <Input label="Motivo (opcional)" value={form.reason} maxLength={120} placeholder="Ex.: Folga" onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        <label className="flex items-center gap-2.5 text-sm text-fg-soft sm:col-span-2">
          <input
            type="checkbox"
            checked={form.fullDay}
            onChange={(e) => setForm({ ...form, fullDay: e.target.checked })}
            className="size-4 accent-[var(--color-brand-600)]"
          />
          Bloquear o dia inteiro
        </label>
        {!form.fullDay && (
          <>
            <Input label="Início" type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
            <Input label="Fim" type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
          </>
        )}
        <Button type="submit" variant="secondary" loading={saving} icon={<Plus className="size-4" />} className="sm:col-span-2">
          Adicionar bloqueio
        </Button>
      </form>
      <p className="mt-3 text-xs text-fg-muted">
        Bloqueios não cancelam agendamentos já existentes — gerencie-os em Agendamentos.
      </p>

      <div className="mt-5 space-y-2">
        {items === null ? null : items.length ? (
          items.map((b) => (
            <Row key={b.id} onDelete={() => remove(b.id)}>
              <Ban className="size-4 text-red-700" />
              <span className="font-medium first-letter:uppercase">{formatDateLong(b.block_date)}</span>
              <span className="text-fg-muted">
                {b.start_time ? `${hhmm(b.start_time)}–${hhmm(b.end_time)}` : 'Dia inteiro'}
                {b.reason && ` · ${b.reason}`}
              </span>
            </Row>
          ))
        ) : (
          <EmptyState title="Nenhum bloqueio futuro" />
        )}
      </div>
    </Card>
  )
}

function Row({ children, onDelete }: { children: React.ReactNode; onDelete: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm animate-fade-in">
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">{children}</div>
      <button onClick={onDelete} className="shrink-0 rounded-lg p-1.5 text-fg-muted hover:bg-red-50 hover:text-red-700" aria-label="Remover">
        <Trash2 className="size-4" />
      </button>
    </div>
  )
}
