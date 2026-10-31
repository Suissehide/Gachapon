import { useId } from 'react'

import type { CardElement } from '../../../constants/card.constant.ts'

/**
 * Aura des cartes Lumière / Ténèbres, posée sur la face comme le holo.
 * « Aube » pour la Lumière : le bas de la carte s'embrase, des poussières
 * dorées montent, un reflet fait le tour du cadre. « Brume des abysses »
 * pour les Ténèbres : une brume violet-noir monte du bas et ronge la carte.
 * Purement visuelle ; les animations s'arrêtent avec la règle reduced-motion
 * globale.
 */
export function ElementAuraOverlay({ element }: { element: CardElement }) {
  if (element === 'LIGHT') {
    return <DawnAura />
  }
  if (element === 'DARK') {
    return <AbyssMistAura />
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

function AbyssMistAura() {
  // Un filtre par carte : plusieurs cartes Ténèbres coexistent dans une
  // grille, chacune a besoin de son propre identifiant SVG.
  const filterId = `abyss-mist-${useId().replace(/:/g, '')}`
  return (
    <div className="pointer-events-none absolute inset-0 z-[2] overflow-hidden rounded-[inherit]">
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <filter id={filterId}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.018 0.035"
            numOctaves={3}
            seed={4}
          />
          <feDisplacementMap in="SourceGraphic" scale={38} />
        </filter>
      </svg>
      {/* La brume déformée une fois pour toutes ; seul son conteneur dérive,
          pour ne pas recalculer le filtre à chaque image */}
      <div className="absolute -inset-[12%] [animation:abyssMist_14s_ease-in-out_infinite_alternate]">
        <div
          className="absolute inset-0"
          style={{
            filter: `url(#${filterId})`,
            background:
              'linear-gradient(0deg, color-mix(in oklab, var(--astral-night-deep) 100%, black 45%) 0%, color-mix(in oklab, var(--astral-night-deep) 95%, transparent) 18%, color-mix(in oklab, var(--astral-night-violet) 60%, var(--astral-night-deep) 40%) 34%, color-mix(in oklab, var(--astral-night-violet) 25%, transparent) 50%, transparent 62%), radial-gradient(ellipse 40% 30% at 0% 50%, color-mix(in oklab, var(--astral-night-deep) 90%, transparent), transparent 70%), radial-gradient(ellipse 40% 30% at 100% 35%, color-mix(in oklab, var(--astral-night-deep) 85%, transparent), transparent 70%)',
          }}
        />
      </div>
      {/* Bords rongés par l'ombre */}
      <div
        className="absolute inset-0 rounded-[inherit]"
        style={{
          boxShadow:
            'inset 0 0 26px color-mix(in oklab, var(--astral-night-deep) 90%, transparent)',
        }}
      />
    </div>
  )
}
