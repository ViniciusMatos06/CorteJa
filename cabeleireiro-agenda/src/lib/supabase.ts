import { createClient } from '@supabase/supabase-js'

export const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true'

const url = isDemoMode ? 'https://demo.supabase.local' : (import.meta.env.VITE_SUPABASE_URL as string | undefined)
const anonKey = isDemoMode ? 'demo' : (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)

export const isSupabaseConfigured = Boolean(url && anonKey)

if (!isSupabaseConfigured) {
  console.error(
    'Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (veja .env.example).',
  )
}

// Armazenamento em memória (usado só no modo demonstração).
const memory = new Map<string, string>()
const memoryStorage = {
  getItem: (k: string) => memory.get(k) ?? null,
  setItem: (k: string, v: string) => void memory.set(k, v),
  removeItem: (k: string) => void memory.delete(k),
}

// A chave "anon" é pública por design. A segurança dos dados vem do RLS
// e das funções do banco (supabase/schema.sql).
export const supabase = createClient(url ?? 'http://localhost', anonKey ?? 'missing-key', {
  auth: {
    persistSession: true,
    autoRefreshToken: !isDemoMode,
    ...(isDemoMode && { storage: memoryStorage }),
  },
  ...(isDemoMode && { global: { fetch: (...args: Parameters<typeof fetch>) => window.fetch(...args) } }),
})
