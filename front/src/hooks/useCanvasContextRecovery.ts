import { useCallback, useRef, useState } from 'react'

/**
 * Récupération après un « THREE.WebGLRenderer: Context Lost » : ni three ni
 * r3f ne restaurent un contexte perdu (r3f peut même le forcer sur un root
 * réutilisé sous StrictMode), donc la seule issue est de remonter le Canvas.
 * Passer `canvasKey` en `key` et `canvasRef` en `ref` du Canvas r3f.
 * Ref de rappel (pas useEffect) : le Canvas peut monter bien après le hook,
 * comme la scène de balle qui n'apparaît qu'en phase de tirage.
 */
export function useCanvasContextRecovery() {
  const [canvasKey, setCanvasKey] = useState(0)
  const detachRef = useRef<(() => void) | null>(null)

  const canvasRef = useCallback((canvas: HTMLCanvasElement | null) => {
    detachRef.current?.()
    detachRef.current = null
    if (!canvas) {
      return
    }
    const handleLost = () => setCanvasKey((key) => key + 1)
    canvas.addEventListener('webglcontextlost', handleLost)
    detachRef.current = () =>
      canvas.removeEventListener('webglcontextlost', handleLost)
  }, [])

  return { canvasKey, canvasRef }
}
