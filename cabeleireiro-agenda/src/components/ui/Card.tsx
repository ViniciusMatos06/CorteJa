import type { HTMLAttributes } from 'react'
import { cn } from './cn'

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={cn('rounded-3xl border border-line bg-surface p-5 sm:p-7', className)}
    />
  )
}

/** Título de seção. `step` só deve ser usado quando o conteúdo é de fato uma sequência. */
export function SectionTitle({ step, title, subtitle }: { step?: number; title: string; subtitle?: string }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      {step != null && (
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-600 font-display text-sm font-bold text-white">
          {step}
        </span>
      )}
      <div>
        <h2 className="font-display text-xl font-semibold tracking-tight text-fg">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-fg-muted">{subtitle}</p>}
      </div>
    </div>
  )
}
