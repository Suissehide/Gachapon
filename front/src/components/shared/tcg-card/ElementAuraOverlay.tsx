import { type CSSProperties, useMemo } from 'react'

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
      {/* Reflet qui fait le tour du cadre : un dégradé conique qui tourne
          (transform, sans repeindre) dont on ne garde que la bordure */}
      <div
        className="absolute inset-0 overflow-hidden rounded-[inherit] p-[2px]"
        style={{
          mask: 'linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)',
        }}
      >
        <div
          className="absolute -inset-1/2 [animation:foilSpin_5s_linear_infinite]"
          style={{
            background:
              'conic-gradient(transparent 0 75%, var(--astral-day-cloud) 85%, transparent 95%)',
          }}
        />
      </div>
    </div>
  )
}

// Étoiles de la nébuleuse : tirées au hasard pour chaque carte, plus denses
// en bas, avec une taille et un rythme de scintillement variés.
const NEBULA_STAR_COUNT = 16

function randomNebulaStars() {
  return Array.from({ length: NEBULA_STAR_COUNT }, (_, i) => ({
    id: i,
    x: 3 + Math.random() * 94,
    // Racine : la densité monte vers le bas de la carte.
    y: 100 - Math.sqrt(Math.random()) * 42,
    size: 1 + Math.random() * 2,
    delay: Math.random() * 3,
    duration: 1.8 + Math.random() * 2.2,
  }))
}

function NebulaAura() {
  const stars = useMemo(randomNebulaStars, [])
  return (
    <div className="pointer-events-none absolute inset-0 z-[2] overflow-hidden rounded-[inherit]">
      {/* Le bas de la carte se fond dans le ciel de nuit de la capsule : nuit
          dense en bas qui s'éclaircit vers le haut, nuages violets, roses et
          bleus qui dérivent (calque plus large que la carte, déplacé en
          transform) */}
      <div
        className="absolute inset-y-0 -inset-x-[10%] [animation:nebulaDrift_18s_ease-in-out_infinite_alternate]"
        style={{
          background:
            'radial-gradient(ellipse 45% 22% at 25% 82%, color-mix(in oklab, var(--astral-night-pink) 48%, transparent), transparent 70%), radial-gradient(ellipse 55% 26% at 72% 76%, color-mix(in oklab, var(--astral-night-violet) 62%, transparent), transparent 70%), radial-gradient(ellipse 35% 18% at 48% 92%, color-mix(in oklab, var(--astral-night-blue) 40%, transparent), transparent 70%), linear-gradient(0deg, color-mix(in oklab, var(--astral-night-deep) 92%, transparent) 0%, color-mix(in oklab, var(--astral-night-deep) 70%, transparent) 22%, color-mix(in oklab, var(--astral-night-deep) 35%, transparent) 45%, transparent 72%)',
          maskImage: 'linear-gradient(0deg, #000 25%, transparent 80%)',
        }}
      />
      {stars.map((star) => (
        <i
          key={star.id}
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
