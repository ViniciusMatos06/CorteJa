import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from './cn'

const control =
  'w-full rounded-xl border bg-surface px-3.5 text-sm text-fg placeholder:text-fg-muted transition-colors ' +
  'focus:outline-none focus:ring-2 focus:ring-brand-600/20 focus:border-brand-600 disabled:opacity-60'

interface WrapperProps {
  label?: string
  error?: string
  hint?: string
  id: string
  children: ReactNode
}

function Wrapper({ label, error, hint, id, children }: WrapperProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-sm font-semibold text-fg-soft">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-red-700">{error}</p>
      ) : hint ? (
        <p className="text-xs text-fg-muted">{hint}</p>
      ) : null}
    </div>
  )
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string; hint?: string }

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, className, id, ...rest }, ref,
) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <Wrapper label={label} error={error} hint={hint} id={fid}>
      <input
        ref={ref}
        id={fid}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${fid}-error` : undefined}
        className={cn(control, 'h-11', error ? 'border-red-400' : 'border-line-strong', className)}
        {...rest}
      />
    </Wrapper>
  )
})

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string; hint?: string }

export function Textarea({ label, error, hint, className, id, ...rest }: TextareaProps) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <Wrapper label={label} error={error} hint={hint} id={fid}>
      <textarea
        id={fid}
        aria-invalid={Boolean(error)}
        className={cn(control, 'min-h-24 py-3', error ? 'border-red-400' : 'border-line-strong', className)}
        {...rest}
      />
    </Wrapper>
  )
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string }

export function Select({ label, error, className, id, children, ...rest }: SelectProps) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <Wrapper label={label} error={error} id={fid}>
      <select id={fid} className={cn(control, 'h-11', error ? 'border-red-400' : 'border-line-strong', className)} {...rest}>
        {children}
      </select>
    </Wrapper>
  )
}
