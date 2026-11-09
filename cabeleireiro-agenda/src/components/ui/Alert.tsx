import type { ReactNode } from 'react'
import { AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { cn } from './cn'

type Tone = 'error' | 'success' | 'info'

const tones: Record<Tone, string> = {
  error: 'border-red-200 bg-red-50 text-red-800',
  success: 'border-brand-100 bg-brand-50 text-brand-700',
  info: 'border-line-strong bg-surface text-fg-soft',
}
const icons = { error: AlertCircle, success: CheckCircle2, info: Info }

export function Alert({ tone = 'info', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  const Icon = icons[tone]
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cn('flex gap-2.5 rounded-xl border p-3.5 text-sm animate-fade-in', tones[tone], className)}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  )
}

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong px-6 py-10 text-center">
      {icon && <div className="mb-3 text-fg-muted">{icon}</div>}
      <p className="font-medium text-fg-soft">{title}</p>
      {children && <div className="mt-1 text-sm text-fg-muted">{children}</div>}
    </div>
  )
}
