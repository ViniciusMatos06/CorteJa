import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Home, LogIn, Scissors, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, SectionTitle } from '@/components/ui/Card'
import { Input, Textarea } from '@/components/ui/Field'
import { Alert, EmptyState } from '@/components/ui/Alert'
import { Modal } from '@/components/ui/Modal'
import { PageLoader } from '@/components/ui/Spinner'
import { MonthCalendar, monthBounds, shiftMonth, type MonthRef } from '@/components/ui/MonthCalendar'
import { ServicePicker } from '@/components/booking/ServicePicker'
import { TimeSlotPicker } from '@/components/booking/TimeSlotPicker'
import { BookingSummary, buildSummary } from '@/components/booking/BookingSummary'
import { BookingTicket, MobileTicketBar, type TicketData } from '@/components/booking/BookingTicket'
import {
  fetchActiveServices, fetchAvailableDates, fetchAvailableSlots, fetchPublicSettings, requestAppointment,
} from '@/services/bookingService'
import { AppError, toAppError } from '@/lib/errors'
import { addDays, formatCurrency, formatDateLong, hhmm, maskPhone, parseISODate, todayIn } from '@/lib/format'
import { validateClient, type ClientErrors } from '@/lib/validation'
import { isSupabaseConfigured } from '@/lib/supabase'
import type { BusinessSettings, Service, TimeSlot } from '@/types'

type Phase = 'form' | 'success'

export default function BookingPage() {
  // ---- dados base
  const [settings, setSettings] = useState<BusinessSettings | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  // ---- seleção
  const [serviceId, setServiceId] = useState<string | null>(null)
  const [month, setMonth] = useState<MonthRef>(() => {
    const d = parseISODate(todayIn())
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const [availableDates, setAvailableDates] = useState<Set<string>>(new Set())
  const [datesLoading, setDatesLoading] = useState(false)
  const [date, setDate] = useState<string | null>(null)
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [time, setTime] = useState<string | null>(null)

  // ---- cliente
  const [name, setName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [address, setAddress] = useState('')
  const [fieldErrors, setFieldErrors] = useState<ClientErrors & { service?: string; date?: string; time?: string }>({})

  // ---- envio
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('form')
  const [refreshKey, setRefreshKey] = useState(0)

  const today = todayIn(settings?.timezone)
  const maxDate = settings ? addDays(today, settings.booking_window_days) : today
  const service = services.find((s) => s.id === serviceId) ?? null

  // Carrega configurações e serviços
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoadError('O sistema ainda não foi configurado. Tente novamente mais tarde.')
      return
    }
    Promise.all([fetchPublicSettings(), fetchActiveServices()])
      .then(([s, sv]) => {
        setSettings(s)
        setServices(sv)
        if (sv.length === 1) setServiceId(sv[0].id)
      })
      .catch((e) => setLoadError(toAppError(e).message))
  }, [])

  // Datas disponíveis do mês visível
  useEffect(() => {
    if (!settings) return
    const { first, last } = monthBounds(month)
    const from = first < today ? today : first
    const to = last > maxDate ? maxDate : last
    if (from > to) {
      setAvailableDates(new Set())
      return
    }
    let active = true
    setDatesLoading(true)
    fetchAvailableDates(from, to)
      .then((d) => active && setAvailableDates(d))
      .catch((e) => active && setSubmitError(toAppError(e).message))
      .finally(() => active && setDatesLoading(false))
    return () => { active = false }
  }, [settings, month, today, maxDate, refreshKey])

  // Horários da data selecionada
  const loadSlots = useCallback((d: string) => {
    setSlotsLoading(true)
    return fetchAvailableSlots(d)
      .then(setSlots)
      .catch((e) => setSubmitError(toAppError(e).message))
      .finally(() => setSlotsLoading(false))
  }, [])

  useEffect(() => {
    if (date) loadSlots(date)
    else setSlots([])
  }, [date, loadSlots, refreshKey])

  const summary = useMemo(
    () =>
      buildSummary({
        name: name.trim(),
        whatsapp,
        address: address.trim(),
        service: service?.name ?? '',
        date: date ? formatDateLong(date) : '',
        time: time ? hhmm(time) : '',
      }),
    [name, whatsapp, address, service, date, time],
  )

  function handleSelectDate(iso: string) {
    setDate(iso)
    setTime(null)
    setFieldErrors((e) => ({ ...e, date: undefined, time: undefined }))
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    const errs = {
      ...validateClient({ name, whatsapp, address }),
      ...(!serviceId && { service: 'Escolha um serviço.' }),
      ...(!date && { date: 'Escolha uma data.' }),
      ...(!time && { time: 'Escolha um horário.' }),
    }
    setFieldErrors(errs)
    if (Object.keys(errs).length) {
      const first = document.querySelector('[aria-invalid="true"], [data-error="true"]')
      first?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setConfirmOpen(true)
  }

  async function handleConfirm() {
    if (!serviceId || !date || !time) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      await requestAppointment({
        clientName: name, clientWhatsapp: whatsapp, clientAddress: address,
        serviceId, date, startTime: time,
      })
      setConfirmOpen(false)
      setPhase('success')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      const appErr = err instanceof AppError ? err : toAppError(err)
      setConfirmOpen(false)
      setSubmitError(appErr.message)
      if (appErr.slotUnavailable) {
        setTime(null)
        setRefreshKey((k) => k + 1)
      }
    } finally {
      setSubmitting(false)
    }
  }

  function resetForm() {
    setPhase('form')
    setDate(null)
    setTime(null)
    setSubmitError(null)
    setRefreshKey((k) => k + 1)
  }

  // ------------------------------------------------------------------ render

  const businessName = settings?.business_name ?? 'Cabeleireiro a Domicílio'

  const ticket: TicketData = {
    service: service?.name,
    price: service?.price != null ? formatCurrency(service.price) : undefined,
    date: date ? formatDateLong(date).replace(/ de \d{4}$/, '') : undefined,
    time: time ? hhmm(time) : undefined,
    address: address.trim() || undefined,
  }

  const topBar = (
    <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 pt-6 sm:px-8">
      <span className="flex size-10 items-center justify-center rounded-full bg-brand-600 text-sun-300">
        <Scissors className="size-[18px]" />
      </span>
      <span className="font-display text-lg font-semibold tracking-tight">{businessName}</span>
      <Link
        to="/admin/login"
        className="ml-auto inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 text-xs font-semibold text-fg-soft transition-colors hover:border-brand-600 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
      >
        <LogIn className="size-3.5" />
        Entrar como cabeleireiro
      </Link>
    </div>
  )

  const hero = (
    <div className="pt-10 pb-8 lg:pt-14">
      <h1 className="max-w-[14ch] font-display text-[2.6rem] leading-[1.02] font-bold tracking-[-0.03em] sm:text-6xl">
        Corte em casa, no horário que cabe na sua rotina.
      </h1>
      <p className="mt-5 max-w-md text-lg leading-relaxed text-fg-soft">
        Masculino, feminino e infantil. Você escolhe o horário e o cabeleireiro confirma pelo WhatsApp.
      </p>
      <ul className="mt-6 flex flex-wrap gap-2 text-sm font-medium text-brand-900">
        <li className="flex items-center gap-1.5 rounded-full bg-sun-100 px-3 py-1.5"><Home className="size-4" /> Vai até você</li>
        <li className="flex items-center gap-1.5 rounded-full bg-sun-100 px-3 py-1.5"><ShieldCheck className="size-4" /> Sem cadastro nem senha</li>
      </ul>
    </div>
  )

  if (loadError) {
    return (
      <Shell>
        {topBar}
        <div className="mx-auto max-w-xl px-5 pt-16"><Alert tone="error">{loadError}</Alert></div>
      </Shell>
    )
  }

  if (!settings) return <Shell>{topBar}<PageLoader /></Shell>

  if (phase === 'success') {
    return (
      <Shell>
        {topBar}
        <main className="mx-auto max-w-lg px-5 pt-12 pb-16">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-sun-400 text-brand-900 animate-pop">
              <CheckCircle2 className="size-8" />
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Pedido enviado</h1>
            <p className="mx-auto mt-3 max-w-sm text-fg-soft">
              O horário fica reservado para você enquanto o cabeleireiro confirma. A resposta chega no WhatsApp {whatsapp}.
            </p>
          </div>
          <BookingTicket data={ticket}>
            <Button variant="secondary" className="w-full" onClick={resetForm}>
              Agendar outro horário
            </Button>
          </BookingTicket>
        </main>
      </Shell>
    )
  }

  const submitButton = (className?: string, label = 'Solicitar agendamento') => (
    <Button type="submit" form="booking-form" size="lg" className={className}>
      {label}
    </Button>
  )

  return (
    <Shell>
      {topBar}
      <main className="mx-auto max-w-6xl px-5 pb-36 sm:px-8 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12 lg:pb-20">
        <div className="min-w-0">
          {hero}
          {services.length === 0 ? (
            <EmptyState icon={<Scissors className="size-6" />} title="Agenda online fechada no momento">
              Nenhum serviço está disponível para agendamento. Tente novamente mais tarde.
            </EmptyState>
          ) : (
            <form id="booking-form" onSubmit={handleSubmit} noValidate className="space-y-5">
              <Card data-error={Boolean(fieldErrors.service)}>
                <SectionTitle step={1} title="Qual corte?" />
                <ServicePicker
                  services={services}
                  selectedId={serviceId}
                  onSelect={(id) => { setServiceId(id); setFieldErrors((e) => ({ ...e, service: undefined })) }}
                />
                {fieldErrors.service && <p className="mt-3 text-sm text-red-700">{fieldErrors.service}</p>}
              </Card>

              <Card data-error={Boolean(fieldErrors.date || fieldErrors.time)}>
                <SectionTitle step={2} title="Quando?" subtitle="Só aparecem dias e horários livres." />
                <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
                  <div>
                    <MonthCalendar
                      month={month}
                      onMonthChange={setMonth}
                      selected={date}
                      onSelect={handleSelectDate}
                      isDisabled={(iso) => !availableDates.has(iso)}
                      canGoPrev={monthBounds(month).first > today}
                      canGoNext={monthBounds(shiftMonth(month, 1)).first <= maxDate}
                      loading={datesLoading}
                      today={today}
                    />
                    {fieldErrors.date && <p className="mt-3 text-sm text-red-700">{fieldErrors.date}</p>}
                  </div>
                  <div>
                    <p className="mb-3 text-sm font-semibold text-fg-soft first-letter:uppercase">
                      {date ? formatDateLong(date).replace(/ de \d{4}$/, '') : 'Horários'}
                    </p>
                    {date ? (
                      <TimeSlotPicker
                        slots={slots}
                        selected={time}
                        loading={slotsLoading}
                        onSelect={(t) => { setTime(t); setFieldErrors((e) => ({ ...e, time: undefined })) }}
                      />
                    ) : (
                      <p className="rounded-2xl bg-tint px-4 py-6 text-sm text-fg-muted">
                        Toque em um dia do calendário para ver os horários.
                      </p>
                    )}
                    {fieldErrors.time && <p className="mt-3 text-sm text-red-700">{fieldErrors.time}</p>}
                  </div>
                </div>
              </Card>

              <Card>
                <SectionTitle step={3} title="Onde e com quem falar?" subtitle="Usamos só para confirmar o atendimento." />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Nome completo"
                    autoComplete="name"
                    placeholder="Maria da Silva"
                    value={name}
                    maxLength={120}
                    onChange={(e) => setName(e.target.value)}
                    error={fieldErrors.name}
                  />
                  <Input
                    label="WhatsApp"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder="(31) 99999-9999"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(maskPhone(e.target.value))}
                    error={fieldErrors.whatsapp}
                  />
                  <div className="sm:col-span-2">
                    <Textarea
                      label="Endereço do atendimento"
                      autoComplete="street-address"
                      placeholder="Rua, número, complemento, bairro e cidade"
                      value={address}
                      maxLength={300}
                      rows={3}
                      onChange={(e) => setAddress(e.target.value)}
                      error={fieldErrors.address}
                    />
                  </div>
                </div>
              </Card>

              {submitError && <Alert tone="error">{submitError}</Alert>}
            </form>
          )}
        </div>

        {services.length > 0 && (
          <aside className="hidden lg:block">
            <div className="sticky top-8 pt-14">
              <BookingTicket data={ticket}>
                {submitButton('w-full')}
                <p className="mt-3 text-center text-xs text-fg-muted">Você revisa tudo antes de enviar.</p>
              </BookingTicket>
            </div>
          </aside>
        )}
      </main>

      {services.length > 0 && <MobileTicketBar data={ticket}>{submitButton('h-12 shrink-0 px-6 text-sm', 'Solicitar')}</MobileTicketBar>}

      <Modal
        open={confirmOpen}
        title="Confira antes de enviar"
        onClose={() => !submitting && setConfirmOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={submitting}>
              Voltar e editar
            </Button>
            <Button onClick={handleConfirm} loading={submitting}>
              Enviar solicitação
            </Button>
          </>
        }
      >
        <BookingSummary items={summary} />
        <p className="mt-4 text-sm text-fg-muted">
          O horário fica reservado enquanto o cabeleireiro confirma pelo WhatsApp.
        </p>
      </Modal>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      {children}
      <footer className="pb-28 text-center text-xs text-fg-faint lg:pb-8">
        Agendamento online · {new Date().getFullYear()}      </footer>
    </div>
  )
}
