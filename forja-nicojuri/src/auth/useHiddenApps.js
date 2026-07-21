import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'

// Lee del Supabase las tarjetas de apps ocultadas por los admins (estado global).
// `refresh` permite recargar tras un cambio desde el panel Admin.
export function useHiddenApps() {
  const [hiddenIds, setHiddenIds] = useState([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const { data } = await supabase.from('forja_hidden_apps').select('app_id')
    setHiddenIds(data?.map(r => r.app_id) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return { hiddenIds, loading, refresh }
}
