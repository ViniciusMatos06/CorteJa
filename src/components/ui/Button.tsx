import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Spinner } from './Spinner'
import { cn } from './cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
type Size = 'sm' | 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
}

const variants: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-[0_6px_16px_-8px_rgba(15,118,110,0.7)]',
  secondary: 'bg-surface text-fg border border-line-strong hover:border-brand-600 hover:text-brand-700',
  ghost: 'text-fg-soft hover:text-fg hover:bg-tint',
  danger: 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100',
  success: 'bg-brand-50 text-brand-700 border border-brand-100 hover:bg-brand-100',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 px-4 text-sm gap-2',
  lg: 'h-14 px-7 text-base gap-2',
}

export function Button({
  variant = 'primary', size = 'md', loading, icon, className, children, disabled, ...rest
}: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-full font-semibold transition-all duration-200',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
        'disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]',
        variants[variant], sizes[size], className,
      )}
    >
      {loading ? <Spinner className="size-4" /> : icon}
      {children}
    </button>
  )
}
