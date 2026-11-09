import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Lock, Scissors } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { signIn } from '@/services/adminService'
import { isDemoMode } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { Alert } from '@/components/ui/Alert'
import { Card } from '@/components/ui/Card'

export default function LoginPage() {
  const { session, loading } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const from = (location.state as { from?: string } | null)?.from ?? '/admin'
  if (!loading && session) return <Navigate to={from} replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email || !password) {
      setError('Informe e-mail e senha.')
      return
    }
    setSubmitting(true)
    try {
      await signIn(email.trim(), password)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-5">
      <Card className="w-full max-w-sm animate-fade-in">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-brand-600 text-sun-300">
            <Scissors className="size-5" />
          </div>
          <h1 className="font-display text-2xl font-semibold">Área do cabeleireiro</h1>
          <p className="mt-1 text-sm text-fg-muted">Entre para gerenciar sua agenda.</p>
          {isDemoMode && (
            <p className="mt-3 rounded-xl bg-sun-100 px-3 py-2 text-xs text-sun-700">
              Demonstração: use qualquer e-mail e senha. Nada é salvo de verdade.
            </p>
          )}
        </div>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input label="E-mail" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Senha" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <Alert tone="error">{error}</Alert>}
          <Button type="submit" className="w-full" loading={submitting} icon={<Lock className="size-4" />}>
            Entrar
          </Button>
        </form>
      </Card>
    </div>
  )
}
