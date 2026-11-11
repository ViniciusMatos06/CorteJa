import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { MailCheck, Scissors, UserPlus } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { BARBER_EMAIL, signUp } from '@/services/adminService'
import { isDemoMode } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { Alert } from '@/components/ui/Alert'
import { Card } from '@/components/ui/Card'

const MIN_PASSWORD = 8

export default function SignupPage() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState(isDemoMode ? '' : BARBER_EMAIL)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  if (!loading && session) return <Navigate to="/admin" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email.trim()) return setError('Informe o e-mail.')
    if (password.length < MIN_PASSWORD) return setError(`A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.`)
    if (password !== confirm) return setError('As senhas não são iguais.')

    setSubmitting(true)
    try {
      const needsConfirmation = await signUp(email, password)
      if (needsConfirmation) setSentTo(email.trim().toLowerCase())
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-5 py-10">
      <Card className="w-full max-w-sm animate-fade-in">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-brand-600 text-sun-300">
            <Scissors className="size-5" />
          </div>
          <h1 className="font-display text-2xl font-semibold">Criar conta</h1>
          <p className="mt-1 text-sm text-fg-muted">Primeiro acesso do cabeleireiro.</p>
        </div>

        {sentTo ? (
          <div className="space-y-4 text-center animate-scale-in">
            <MailCheck className="mx-auto size-10 text-brand-600" />
            <p className="text-sm text-fg-soft">
              Enviamos um link de confirmação para <strong className="break-all">{sentTo}</strong>.
              Abra o e-mail, clique no link e depois entre com sua senha.
            </p>
            <p className="text-xs text-fg-muted">Não chegou? Olhe a caixa de spam.</p>
            <Button className="w-full" onClick={() => navigate('/admin/login')}>Ir para o login</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <Input
              label="E-mail"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              hint={isDemoMode ? undefined : 'Somente o e-mail do cabeleireiro pode criar conta.'}
            />
            <Input
              label="Senha"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              hint={`Pelo menos ${MIN_PASSWORD} caracteres.`}
            />
            <Input
              label="Repita a senha"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            {error && <Alert tone="error">{error}</Alert>}
            <Button type="submit" className="w-full" loading={submitting} icon={<UserPlus className="size-4" />}>
              Criar conta
            </Button>
            <p className="text-center text-sm text-fg-muted">
              Já tem conta?{' '}
              <Link to="/admin/login" className="font-semibold text-brand-600 hover:underline">Entrar</Link>
            </p>
          </form>
        )}
      </Card>
    </div>
  )
}
