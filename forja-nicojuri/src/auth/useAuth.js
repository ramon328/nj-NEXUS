import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export function useAuth() {
  const [authed, setAuthed] = useState(false)
  const [user, setUser]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verificar sesión activa contra Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthed(!!session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Escuchar cambios (login, logout, refresh de token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session)
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = async (email, pass) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass })
    if (error) return error.message
    return true
  }

  const logout = async () => {
    await supabase.auth.signOut()
  }

  return { authed, login, logout, user, loading }
}
