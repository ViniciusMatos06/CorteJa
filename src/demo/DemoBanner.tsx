import { Link, useLocation } from 'react-router-dom'
import { FlaskConical } from 'lucide-react'

/** Faixa exibida apenas no modo demonstração. */
export function DemoBanner() {
  const { pathname } = useLocation()
  const inAdmin = pathname.startsWith('/admin')
  return (
    <div className="relative z-40 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-sun-300 bg-sun-100 px-4 py-2 text-center text-xs text-sun-700">
      <span className="flex items-center gap-1.5">
        <FlaskConical className="size-3.5" />
        <strong>Demonstração</strong> — banco simulado no navegador; nada é salvo de verdade.
      </span>
      {inAdmin ? (
        <Link to="/" className="font-medium underline underline-offset-2">Ver página do cliente</Link>
      ) : (
        <Link to="/admin" className="font-medium underline underline-offset-2">Abrir painel do cabeleireiro (qualquer e-mail e senha)</Link>
      )}
    </div>
  )
}
