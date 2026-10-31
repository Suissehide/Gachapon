import type { CSSProperties } from 'react'

import type { CardElement } from '../../../constants/card.constant.ts'

/**
 * Aura des cartes Lumière / Ténèbres, posée sur la face comme le holo.
 * « Aube » pour la Lumière : le bas de la carte s'embrase, des poussières
 * dorées montent, un reflet fait le tour du cadre. « Nébuleuse » pour les
 * Ténèbres : le bas de la carte se fond dans le ciel de nuit de la capsule
 * astrale, avec des étoiles qui scintillent.
 * Purement visuelle ; les animations s'arrêtent avec la règle reduced-motion
 * globale.
 */
export function ElementAuraOverlay({ element }: { element: CardElement }) {
  if (element === 'LIGHT') {
    return <DawnAura />
  }
  if (element === 'DARK') {
    return <NebulaAura />
  }
  return null
}

// Poussières : position de départ (en % de la largeur et du bas) et décalage
// d'animation, fixes pour que deux cartes identiques s'animent pareil.
const MOTES = [
  { left: 18, bottom: 6, delay: 0 },
  { left: 34, bottom: 10, delay: 1.1 },
  { left: 52, bottom: 4, delay: 0.5 },
  { left: 68, bottom: 9, delay: 2 },
  { left: 82, bottom: 5, delay: 2.8 },
  { left: 44, bottom: 14, delay: 3.3 },
]

function DawnAura() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[2] overflow-hidden rounded-[inherit]">
      {/* Le bas de la carte s'embrase */}
      <div
        className="absolute inset-0 mix-blend-screen [animation:auraBreath_6s_ease-in-out_infinite]"
        style={{
          background:
            'linear-gradient(0deg, color-mix(in oklab, var(--astral-gold-deep) 55%, transparent) 0%, color-mix(in oklab, var(--astral-day-haze) 35%, transparent) 28%, transparent 60%)',
        }}
      />
      {/* Poussières dorées qui montent */}
      {MOTES.map((m) => (
        <i
          key={`${m.left}-${m.bottom}`}
          className="absolute size-1 rounded-full opacity-0 [animation:dawnMote_4s_ease-in_infinite]"
          style={{
            left: `${m.left}%`,
            bottom: `${m.bottom}%`,
            animationDelay: `${m.delay}s`,
            background: 'var(--astral-day-cloud)',
            boxShadow:
              '0 0 8px 2px color-mix(in oklab, var(--astral-gold) 90%, transparent)',
          }}
        />
      ))}
      {/* Reflet qui fait le tour du cadre : un dégradé conique dont on ne
          garde que la bordure */}
      <div
        className="absolute inset-0 rounded-[inherit] p-[2px] [animation:dawnSheen_5s_linear_infinite]"
        style={{
          background:
            'conic-gradient(from var(--dawn-angle), transparent 0 75%, var(--astral-day-cloud) 85%, transparent 95%)',
          mask: 'linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)',
        }}
      />
    </div>
  )
}

// Étoiles de la nébuleuse : positions fixes dans le bas de la carte (en %),
// taille en px et rythme de scintillement variés.
const NEBULA_STARS = [
  { x: 8, y: 92, size: 2, delay: 0, duration: 2.6 },
  { x: 17, y: 78, size: 1.5, delay: 1.2, duration: 3.1 },
  { x: 26, y: 88, size: 2.5, delay: 0.4, duration: 2.2 },
  { x: 34, y: 70, size: 1.5, delay: 2, duration: 3.4 },
  { x: 42, y: 95, size: 2, delay: 0.8, duration: 2.8 },
  { x: 51, y: 82, size: 1.5, delay: 1.6, duration: 2.4 },
  { x: 60, y: 74, size: 2.5, delay: 0.2, duration: 3 },
  { x: 68, y: 90, size: 1.5, delay: 2.4, duration: 2.6 },
  { x: 76, y: 79, size: 2, delay: 1, duration: 3.3 },
  { x: 85, y: 93, size: 1.5, delay: 0.6, duration: 2.3 },
  { x: 92, y: 72, size: 2, delay: 1.8, duration: 2.9 },
  { x: 12, y: 66, size: 1.5, delay: 2.8, duration: 3.2 },
  { x: 72, y: 64, size: 1.5, delay: 0.9, duration: 2.7 },
  { x: 47, y: 62, size: 1.5, delay: 2.2, duration: 3.5 },
]

function NebulaAura() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[2] overflow-hidden rounded-[inherit]">
      {/* Le bas de la carte se fond dans le ciel de nuit de la capsule :
          voile sombre léger et nuages violets, roses et bleus qui dérivent */}
      <div
        className="absolute inset-0 [animation:nebulaDrift_18s_ease-in-out_infinite_alternate] [background-size:120%_120%]"
        style={{
          background:
            'radial-gradient(ellipse 45% 22% at 25% 82%, color-mix(in oklab, var(--astral-night-pink) 32%, transparent), transparent 70%), radial-gradient(ellipse 55% 26% at 72% 76%, color-mix(in oklab, var(--astral-night-violet) 45%, transparent), transparent 70%), radial-gradient(ellipse 35% 18% at 48% 92%, color-mix(in oklab, var(--astral-night-blue) 28%, transparent), transparent 70%), linear-gradient(0deg, color-mix(in oklab, var(--astral-night-deep) 70%, transparent) 0%, color-mix(in oklab, var(--astral-night-deep) 40%, transparent) 25%, transparent 58%)',
          maskImage: 'linear-gradient(0deg, #000 30%, transparent 70%)',
        }}
      />
      {NEBULA_STARS.map((star) => (
        <i
          key={`${star.x}-${star.y}`}
          className="absolute rounded-full [animation:nebulaTwinkle_var(--twinkle)_ease-in-out_infinite]"
          style={
            {
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: star.size,
              height: star.size,
              animationDelay: `${star.delay}s`,
              '--twinkle': `${star.duration}s`,
              background: 'white',
              boxShadow:
                '0 0 4px 1px color-mix(in oklab, var(--astral-night-violet) 60%, white)',
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}
