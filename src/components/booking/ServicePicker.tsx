import { Check } from 'lucide-react'
import type { Service } from '@/types'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/components/ui/cn'

interface Props {
  services: Service[]
  selectedId: string | null
  onSelect: (id: string) => void
}

type Kind = 'masculino' | 'feminino' | 'infantil' | 'outro'

function kindOf(name: string): Kind {
  const n = name.toLowerCase()
  if (n.includes('infant') || n.includes('criança') || n.includes('kids')) return 'infantil'
  if (n.includes('femin')) return 'feminino'
  if (n.includes('mascul')) return 'masculino'
  return 'outro'
}

/** Pictogramas simples de cabelo — trocam conforme o nome do serviço. */
function HairGlyph({ kind }: { kind: Kind }) {
  const hair = 'fill-brand-900'
  const skin = 'fill-[#F2C9A6]'
  return (
    <svg viewBox="9 9 46 46" className="size-14" aria-hidden>
      {kind === 'feminino' && (
        <>
          <path className={hair} d="M15 30c0-11 7.6-19 17-19s17 8 17 19v20c0 2-1.6 3-3.6 3H18.6c-2 0-3.6-1-3.6-3z" />
          <circle className={skin} cx="32" cy="31" r="11" />
          <path className={hair} d="M20.5 29c2-7.5 7-11 11.5-11 5.6 0 10 3.3 11.6 10.4-7.4.6-15.6-1.6-20-6.4-.9 3.3-1.8 5.4-3.1 7z" />
        </>
      )}
      {kind === 'masculino' && (
        <>
          <circle className={skin} cx="32" cy="34" r="13" />
          <path className={hair} d="M18.6 32c-.8-10.4 5.6-17 13.6-17 8.4 0 14.2 6 13.2 16.4-1-3.6-3-6.2-5.6-7.4-5.2 2.4-13.2 2.8-18.4.6-1.6 1.6-2.4 4.4-2.8 7.4z" />
        </>
      )}
      {kind === 'infantil' && (
        <>
          <circle className={hair} cx="15" cy="30" r="6" />
          <circle className={hair} cx="49" cy="30" r="6" />
          <circle className={skin} cx="32" cy="35" r="12" />
          <path className={hair} d="M20 33c-.4-9 5.2-14.6 12-14.6 7 0 12.4 5.6 12 14.6-2.6-4.2-6.6-6.4-12-6.4s-9.4 2.2-12 6.4z" />
        </>
      )}
      {kind === 'outro' && (
        <g className="fill-none stroke-brand-900" strokeWidth="3.5" strokeLinecap="round">
          <circle cx="22" cy="44" r="6" />
          <circle cx="42" cy="44" r="6" />
          <path d="M26 39 44 16M38 39 20 16" />
        </g>
      )}
    </svg>
  )
}

export function ServicePicker({ services, selectedId, onSelect }: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {services.map((s) => {
        const active = s.id === selectedId
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            aria-pressed={active}
            className={cn(
              'relative flex items-center gap-4 rounded-2xl border-2 p-4 text-left transition-colors duration-200 sm:flex-col sm:items-start sm:gap-3 sm:p-5',
              active ? 'border-brand-600 bg-brand-50' : 'border-line bg-surface hover:border-brand-100 hover:bg-tint',
            )}
          >
            <span
              className={cn(
                'flex size-16 shrink-0 items-center justify-center rounded-full transition-colors',
                active ? 'bg-sun-400' : 'bg-sun-100',
              )}
            >
              <HairGlyph kind={kindOf(s.name)} />
            </span>
            <span className="min-w-0">
              <span className="block font-display text-lg leading-tight font-semibold">{s.name}</span>
              {s.description && <span className="mt-1 block text-sm leading-snug text-fg-muted">{s.description}</span>}
              {s.price != null && (
                <span className="mt-2 block text-sm font-bold text-brand-700">{formatCurrency(s.price)}</span>
              )}
            </span>
            {active && (
              <span className="absolute top-3 right-3 flex size-6 items-center justify-center rounded-full bg-brand-600 text-white animate-pop">
                <Check className="size-3.5" strokeWidth={3} />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
