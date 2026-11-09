import { cn } from './cn'

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Carregando"
      className={cn('inline-block size-5 animate-spin rounded-full border-2 border-current border-r-transparent', className)}
    />
  )
}

export function PageLoader({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-fg-muted">
      <Spinner className="size-6 text-brand-600" />
      <span className="text-sm">{label}</span>
    </div>
  )
}
