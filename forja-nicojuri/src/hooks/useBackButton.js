import { useEffect, useRef } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// useBackButton — hace que el botón "Atrás" del navegador / gesto Atrás del
// celular suba UN nivel dentro de la app (PWA) en vez de salir al hub o cerrar.
//
// Cada pantalla anidada llama useBackButton(activo, irAtras). Mientras está
// activa, empuja una entrada "trampa" en el historial; al presionar Atrás se
// consume esa entrada y se ejecuta irAtras() (que sube un nivel), sin abandonar
// el apartado. Los niveles se apilan, así que Atrás los recorre de a uno.
//
// Los botones internos ("← Volver al hub", "← Proyectos", etc.) siguen llamando
// a su setState directo; al desmontarse la pantalla, este hook consume su propia
// entrada del historial para mantenerlo sincronizado.
// ─────────────────────────────────────────────────────────────────────────────

const stack = []          // pila de { fn, byPop } — uno por nivel activo
let suppress = 0          // history.back() internos a ignorar en popstate
let listening = false

function handlePop() {
  if (suppress > 0) { suppress--; return }   // back() disparado por nosotros: ignorar
  const top = stack[stack.length - 1]
  if (top) { top.byPop = true; top.fn() }    // sube un nivel; el navegador ya consumió la entrada
}

export function useBackButton(active, onBack) {
  const onBackRef = useRef(onBack)
  onBackRef.current = onBack

  useEffect(() => {
    if (!active) return

    if (!listening) {
      window.addEventListener('popstate', handlePop)
      listening = true
    }

    const entry = { fn: () => onBackRef.current(), byPop: false }
    window.history.pushState({ __back: stack.length + 1 }, '')
    stack.push(entry)

    return () => {
      const i = stack.lastIndexOf(entry)
      if (i >= 0) stack.splice(i, 1)
      // Cierre por botón interno (no por Atrás): consumimos nuestra entrada
      // trampa sin re-disparar el handler.
      if (!entry.byPop) {
        suppress++
        window.history.back()
      }
    }
  }, [active])
}
