import { CalendarDays, Check, Clock, MapPin, MessageCircle, Phone, X, Ban } from 'lucide-react'
import type { Appointment, AppointmentStatus } from '@/types'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { isDemoMode } from '@/lib/supabase'
import { displayPhone, formatCurrency, formatDateLong, hhmm, whatsappLink } from '@/lib/format'

// Na demonstração hospedada (página em iframe isolado), abrir nova aba é bloqueado;
// um link simples é aberto pelo próprio claude.ai. No site real, abre em nova aba.
const externalLinkProps = isDemoMode ? { rel: 'noreferrer' } : { target: '_blank', rel: 'noreferrer' }

interface Props {
  appointment: Appointment
  onAction: (appointment: Appointment, status: AppointmentStatus) => void
  busy?: boolean
  compact?: boolean
}

export function AppointmentCard({ appointment: a, onAction, busy, compact }: Props) {
  const firstName = a.client_name.split(' ')[0]
  const message =
    `Olá, ${firstName}! Aqui é o cabeleireiro, sobre seu agendamento de ${a.service_name} ` +
    `em ${formatDateLong(a.appointment_date)} às ${hhmm(a.start_time)}.`
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.client_address)}`

  return (
    <article className="rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-line-strong animate-fade-in sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-semibold">{a.client_name}</h3>
          <p className="text-sm text-brand-600">
            {a.service_name}
            {a.service_price != null && <span className="text-fg-muted"> · {formatCurrency(a.service_price)}</span>}
          </p>
        </div>
        <StatusBadge status={a.status} />
      </div>

      <dl className="mt-3 grid gap-2 text-sm text-fg-soft sm:grid-cols-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 shrink-0 text-fg-muted" />
          <span className="first-letter:uppercase">{formatDateLong(a.appointment_date)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="size-4 shrink-0 text-fg-muted" />
          {hhmm(a.start_time)} – {hhmm(a.end_time)}
        </div>
        <div className="flex items-center gap-2">
          <Phone className="size-4 shrink-0 text-fg-muted" />
          {displayPhone(a.client_whatsapp)}
        </div>
        {!compact && (
          <a href={mapsUrl} {...externalLinkProps} className="flex items-start gap-2 hover:text-brand-600 sm:col-span-2">
            <MapPin className="mt-0.5 size-4 shrink-0 text-fg-muted" />
            <span className="break-words">{a.client_address}</span>
          </a>
        )}
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={whatsappLink(a.client_whatsapp, message)}
          {...externalLinkProps}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#25D366]/40 bg-[#25D366]/10 px-3 text-sm font-medium text-[#128C4B] transition-colors hover:bg-[#25D366]/20"
        >
          <MessageCircle className="size-4" /> WhatsApp
        </a>
        {a.status === 'pending' && (
          <>
            <Button size="sm" variant="success" icon={<Check className="size-4" />} disabled={busy} onClick={() => onAction(a, 'confirmed')}>
              Aprovar
            </Button>
            <Button size="sm" variant="danger" icon={<X className="size-4" />} disabled={busy} onClick={() => onAction(a, 'declined')}>
              Recusar
            </Button>
          </>
        )}
        {a.status === 'confirmed' && (
          <Button size="sm" variant="danger" icon={<Ban className="size-4" />} disabled={busy} onClick={() => onAction(a, 'cancelled')}>
            Cancelar
          </Button>
        )}
      </div>
    </article>
  )
}
