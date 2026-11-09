import { Clock } from 'lucide-react'
import type { TimeSlot } from '@/types'
import { hhmm } from '@/lib/format'
import { cn } from '@/components/ui/cn'
import { EmptyState } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'

interface Props {
  slots: TimeSlot[]
  selected: string | null
  onSelect: (start: string) => void
  loading: boolean
}

export function TimeSlotPicker({ slots, selected, onSelect, loading }: Props) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-fg-muted">
        <Spinner className="size-4 text-brand-600" /> Buscando horários livres…
      </div>
    )
  }
  if (!slots.length) {
    return (
      <EmptyState icon={<Clock className="size-6" />} title="Nenhum horário livre nesta data">
        Escolha outro dia no calendário.
      </EmptyState>
    )
  }
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-3">
      {slots.map((s) => {
        const active = s.slot_start === selected
        return (
          <button
            key={s.slot_start}
            type="button"
            onClick={() => onSelect(s.slot_start)}
            aria-pressed={active}
            className={cn(
              'h-11 rounded-full border-2 text-sm font-semibold tabular-nums transition-colors duration-150',
              active
                ? 'border-brand-600 bg-brand-600 text-white'
                : 'border-line bg-surface text-fg hover:border-brand-600',
            )}
          >
            {hhmm(s.slot_start)}
          </button>
        )
      })}
    </div>
  )
}
