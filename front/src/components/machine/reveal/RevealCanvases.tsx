// front/src/components/machine/reveal/RevealCanvases.tsx
import { useEffect } from 'react'

import type { CanvasRefs } from './types'

const CANVAS_KEYS = ['dots', 'speed', 'ink', 'wave', 'pt', 'chrom'] as const
const Z_INDEXES: Record<(typeof CANVAS_KEYS)[number], number> = {
  dots: 51,
  speed: 52,
  ink: 54,
  wave: 56,
  pt: 59,
  chrom: 70,
}

type Props = { refs: CanvasRefs }

export function RevealCanvases({ refs }: Props) {
  // biome-ignore lint/correctness/useExhaustiveDependencies: Dynamic key access to refs properties; individual refs in deps array
  useEffect(() => {
    const resize = () => {
      for (const key of CANVAS_KEYS) {
        const canvas = refs[key].current
        if (canvas) {
          canvas.width = window.innerWidth
          canvas.height = window.innerHeight
        }
      }
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [refs.dots, refs.speed, refs.ink, refs.wave, refs.pt, refs.chrom])

  return (
    <>
      {CANVAS_KEYS.map((key) => (
        <canvas
          key={key}
          ref={refs[key]}
          style={{
            position: 'fixed',
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
