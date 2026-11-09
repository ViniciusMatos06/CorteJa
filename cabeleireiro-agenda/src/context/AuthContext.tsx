import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { checkIsAdmin } from '@/services/adminService'

interface AuthState {
  session: Session | null
  isAdmin: boolean
  loading: boolean
}

const AuthContext = createContext<AuthState>({ session: null, isAdmin: false, loading: true })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, isAdmin: false, loading: true })

  useEffect(() => {
    let active = true

    async function apply(session: Session | null) {
      const isAdmin = session ? await checkIsAdmin() : false
      if (active) setState({ session, isAdmin, loading: false })
    }

    supabase.auth.getSession().then(({ data }) => apply(data.session))

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED') {
        setState((s) => ({ ...s, session }))
        return
      }
      setState((s) => ({ ...s, loading: true }))
      // Evita chamar o Supabase dentro do callback (recomendação da lib).
      setTimeout(() => apply(session), 0)
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
