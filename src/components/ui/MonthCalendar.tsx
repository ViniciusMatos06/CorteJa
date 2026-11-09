import { ChevronLeft, ChevronRight } from 'lucide-react'
import { MONTHS, WEEKDAYS_SHORT, toISODate } from '@/lib/format'
import { Spinner } from './Spinner'
import { cn } from './cn'

export interface MonthRef { year: number; month: number } // month: 0-11

interface Props {
  month: MonthRef
  onMonthChange: (m: MonthRef) => void
  selected?: string | null
  onSelect: (iso: string) => void
  isDisabled?: (iso: string) => boolean
  /** Conteúdo extra abaixo do número (ex.: contagem de agendamentos). */
  renderMarker?: (iso: string) => React.ReactNode
  canGoPrev?: boolean
  canGoNext?: boolean
  loading?: boolean
  today: string
}

export function shiftMonth({ year, month }: MonthRef, delta: number): MonthRef {
  const d = new Date(year, month + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() }
}

export function monthBounds({ year, month }: MonthRef) {
  return { first: toISODate(new Date(year, month, 1)), last: toISODate(new Date(year, month + 1, 0)) }
}

export function MonthCalendar({
  month, onMonthChange, selected, onSelect, isDisabled, renderMarker,
  canGoPrev = true, canGoNext = true, loading, today,
}: Props) {
  const firstWeekday = new Date(month.year, month.month, 1).getDay()
  const daysInMonth = new Date(month.year, month.month + 1, 0).getDate()
  const cells: (string | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => toISODate(new Date(month.year, month.month, i + 1))),
  ]

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onMonthChange(shiftMonth(month, -1))}
          disabled={!canGoPrev}
          className="rounded-lg p-2 text-fg-soft hover:bg-tint disabled:opacity-30 disabled:hover:bg-transparent"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div className="flex items-center gap-2 font-display text-base font-semibold">
          {MONTHS[month.month]} {month.year}
          {loading && <Spinner className="size-3.5 text-brand-600" />}
        </div>
        <button
          type="button"
          onClick={() => onMonthChange(shiftMonth(month, 1))}
          disabled={!canGoNext}
          className="rounded-lg p-2 text-fg-soft hover:bg-tint disabled:opacity-30 disabled:hover:bg-transparent"
          aria-label="Próximo mês"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-fg-muted">
        {WEEKDAYS_SHORT.map((d) => <div key={d} className="py-1.5">{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((iso, i) => {
          if (!iso) return <div key={`e${i}`} />
          const disabled = isDisabled?.(iso) ?? false
          const isSelected = iso === selected
          const isToday = iso === today
          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(iso)}
              aria-pressed={isSelected}
              aria-label={iso}
              className={cn(
                'relative flex aspect-square flex-col items-center justify-center rounded-full text-sm transition-colors duration-150',
                isSelected
                  ? 'bg-brand-600 font-semibold text-white'
                  : disabled
                    ? 'cursor-not-allowed text-fg-faint'
                    : 'bg-brand-50 font-semibold text-brand-900 hover:bg-brand-100',
                isToday && !isSelected && 'ring-2 ring-sun-400',
              )}
            >
              {Number(iso.slice(8))}
              {renderMarker?.(iso)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
