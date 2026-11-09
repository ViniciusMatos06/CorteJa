import { CalendarDays, Clock, MapPin, Phone, Scissors, User } from 'lucide-react'
import type { ReactNode } from 'react'

export interface SummaryItem { icon: ReactNode; label: string; value: string }

export function buildSummary(d: {
  name: string; whatsapp: string; address: string; service: string; date: string; time: string
}): SummaryItem[] {
  return [
    { icon: <Scissors className="size-4" />, label: 'Serviço', value: d.service },
    { icon: <CalendarDays className="size-4" />, label: 'Data', value: d.date },
    { icon: <Clock className="size-4" />, label: 'Horário', value: d.time },
    { icon: <User className="size-4" />, label: 'Nome', value: d.name },
    { icon: <Phone className="size-4" />, label: 'WhatsApp', value: d.whatsapp },
    { icon: <MapPin className="size-4" />, label: 'Endereço', value: d.address },
  ]
}

export function BookingSummary({ items }: { items: SummaryItem[] }) {
  return (
    <dl className="divide-y divide-line rounded-xl border border-line bg-surface">
      {items.map((it) => (
        <div key={it.label} className="flex gap-3 px-4 py-3">
          <dt className="flex w-28 shrink-0 items-center gap-2 text-sm text-fg-muted">
            <span className="text-brand-600">{it.icon}</span>
            {it.label}
          </dt>
          <dd className="min-w-0 text-sm font-medium break-words first-letter:uppercase">{it.value}</dd>
        </div>
      ))}
    </dl>
  )
}
