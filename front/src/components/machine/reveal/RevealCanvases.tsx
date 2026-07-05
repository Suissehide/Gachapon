// front/src/components/machine/reveal/RevealCanvases.tsx
import { useEffect } from 'react'

import type { CanvasRefs } from './types'

const CANVAS_KEYS = ['dots', 'speed', 'ink', 'wave', 'pt', 'chrom'] as const
const Z_INDEXES: Record<(typeof CANVAS_KEYS)[number], number> = {
  dots: 1,
  speed: 2,
  ink: 3,
  wave: 4,
  pt: 5,
  chrom: 6,
}

type Props = { refs: CanvasRefs; scoped?: boolean }

export function RevealCanvases({ refs, scoped = false }: Props) {
  // biome-ignore lint/correctness/useExhaustiveDependencies: Dynamic key access to refs properties; individual refs in deps array
  useEffect(() => {
    const resize = () => {
      for (const key of CANVAS_KEYS) {
        const canvas = refs[key].current
        if (!canvas) { continue }
        if (scoped) {
          const parent = canvas.parentElement
          canvas.width = parent?.clientWidth ?? window.innerWidth
          canvas.height = parent?.clientHeight ?? window.innerHeight
        } else {
          canvas.width = window.innerWidth
          canvas.height = window.innerHeight
        }
      }
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [refs.dots, refs.speed, refs.ink, refs.wave, refs.pt, refs.chrom, scoped])

  return (
    <>
      {CANVAS_KEYS.map((key) => (
        <canvas
          key={key}
          ref={refs[key]}
          style={{
            position: scoped ? 'absolute' : 'fixed',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: Z_INDEXES[key],
            ...(key === 'chrom' ? { mixBlendMode: 'multiply' } : {}),
          }}
        />
      ))}
    </>
  )
}
