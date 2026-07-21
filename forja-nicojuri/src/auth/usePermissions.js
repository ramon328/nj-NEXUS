import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export function usePermissions(userId, userEmail) {
  // Un solo objeto de estado para que perfil/permisos/loadedFor se apliquen juntos.
  const [state, setState] = useState({
    profile: null,
    permissions: null,
    error: false,
    loadedFor: undefined,   // el userId cuyos datos ya están cargados
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    if (!userId) {
      setState({ profile: null, permissions: null, error: false, loadedFor: undefined })
      setLoading(false)
      return
    }

    setLoading(true)
    Promise.all([
      supabase.from('forja_profiles').select('id, name, email, role').eq('id', userId).single(),
      supabase.from('forja_permissions').select('*').eq('user_id', userId),
    ]).then(([profRes, permRes]) => {
      if (cancelled) return
      // Si alguna query falló (RLS, token a medio refrescar, red), lo marcamos
      // como error para NO restringir las apps por un fallo transitorio.
      const error = Boolean(profRes?.error) || Boolean(permRes?.error)
      setState({
        profile: profRes?.data ?? null,
        permissions: permRes?.data ?? [],
        error,
        loadedFor: userId,
      })
      setLoading(false)
    }).catch(() => {
      if (cancelled) return
      setState({ profile: null, permissions: null, error: true, loadedFor: userId })
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [userId])

  const { profile, permissions, error, loadedFor } = state

  // Cargando mientras haya un usuario cuyos datos aún no resolvimos. Esto evita
  // el render intermedio (justo tras restaurar la sesión) donde el efecto todavía
  // no corrió y se pintaba la grilla con datos a medias.
  const effectiveLoading = loading || (Boolean(userId) && loadedFor !== userId)

  // Fallback por email para cuando RLS bloquea la lectura del perfil
  const ADMIN_EMAILS = ['njuri@dropout.cl', 'ramon@dropout.cl']
  const isAdmin = profile?.role === 'admin'
    || (!effectiveLoading && ADMIN_EMAILS.includes((userEmail ?? '').toLowerCase()))

  // Mostrar TODO (sin restringir) si: es admin, no hay perfil, o hubo un error de
  // carga. Solo restringimos cuando tenemos una lista de permisos confiable.
  const allowedAppIds = (isAdmin || profile === null || error)
    ? null
    : permissions?.map(p => p.app_id) ?? []

  return { profile, permissions, isAdmin, allowedAppIds, loading: effectiveLoading }
}
