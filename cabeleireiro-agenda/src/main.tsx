import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

async function bootstrap() {
  // Modo demonstração: banco simulado no navegador (nunca incluído no build normal).
  if (import.meta.env.VITE_DEMO_MODE === 'true') {
    const { installMockBackend } = await import('./demo/mockBackend')
    installMockBackend()
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

bootstrap()
