import type { AppointmentStatus } from '@/types'
import { cn } from './cn'

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  declined: 'Recusado',
  cancelled: 'Cancelado',
}

const styles: Record<AppointmentStatus, string> = {
  pending: 'bg-sun-100 text-sun-700 border-sun-300',
  confirmed: 'bg-brand-50 text-brand-700 border-brand-100',
  declined: 'bg-tint text-fg-muted border-line-strong',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
}

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium', styles[status])}>
      <span className="size-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </span>
  )
}
