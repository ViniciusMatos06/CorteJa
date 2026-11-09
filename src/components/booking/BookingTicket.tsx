import { CalendarDays, Clock, MapPin, Scissors } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/components/ui/cn'

export interface TicketData {
  service?: string
  price?: string
  date?: string
  time?: string
  address?: string
}

function Row({ icon, label, value }: { icon: ReactNode; label: string; value?: string }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <span className={cn('mt-0.5', value ? 'text-brand-600' : 'text-fg-faint')}>{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-fg-muted">{label}</p>
        <p className={cn('text-[15px] font-semibold break-words first-letter:uppercase', value ? 'text-fg' : 'text-fg-faint')}>
          {value || 'A escolher'}
        </p>
      </div>
    </div>
  )
}

/**
 * Resumo do agendamento que se preenche enquanto o cliente escolhe.
 * Visual de "ticket": topo verde, picote e corpo branco.
 */
export function BookingTicket({ data, children }: { data: TicketData; children?: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[28px] shadow-[0_20px_40px_-24px_rgba(10,58,53,0.45)]">
      <div className="bg-brand-600 px-6 pt-6 pb-7 text-white">
        <p className="text-sm text-brand-100">Seu agendamento</p>
        <p className="mt-1 font-display text-2xl leading-tight font-semibold">
          {data.service ?? 'Escolha um serviço'}
        </p>
        {data.price && <p className="mt-1 text-sm font-semibold text-sun-300">{data.price}</p>}
      </div>
      {/* picote */}
      <div className="relative h-0 border-t-2 border-dashed border-brand-100 bg-surface">
        <span className="absolute -top-3 -left-3 size-6 rounded-full bg-canvas" />
        <span className="absolute -top-3 -right-3 size-6 rounded-full bg-canvas" />
      </div>
      <div className="bg-surface px-6 pt-3 pb-6">
        <div className="divide-y divide-line">
          <Row icon={<CalendarDays className="size-4" />} label="Dia" value={data.date} />
          <Row icon={<Clock className="size-4" />} label="Horário" value={data.time} />
          <Row icon={<MapPin className="size-4" />} label="Endereço" value={data.address} />
        </div>
        {children && <div className="mt-5">{children}</div>}
      </div>
    </div>
  )
}

/** Barra fixa no rodapé (celular) com o essencial do agendamento. */
export function MobileTicketBar({ data, children }: { data: TicketData; children: ReactNode }) {
  const summary = [data.date, data.time].filter(Boolean).join(' às ')
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-xl items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sun-100 text-brand-700">
          <Scissors className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{data.service ?? 'Escolha um serviço'}</p>
          <p className="truncate text-xs text-fg-muted">{summary || 'Dia e horário a escolher'}</p>
        </div>
        {children}
      </div>
    </div>
  )
}
