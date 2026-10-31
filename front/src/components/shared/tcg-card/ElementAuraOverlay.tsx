import type { CardElement } from '../../../constants/card.constant.ts'

/**
 * Aura des cartes Lumière / Ténèbres, posée sur la face comme le holo :
 * « céleste » (rayons dorés qui tournent lentement, lumière qui respire par
 * le haut) ou « abyssale » (vignette sombre, fumée violette qui dérive, lueur
 * sur les bords). Purement visuelle. Les animations s'arrêtent avec la règle
 * reduced-motion globale.
 */
export function ElementAuraOverlay({ element }: { element: CardElement }) {
  if (element === 'LIGHT') {
    return <CelestialAura />
  }
  if (element === 'DARK') {
    return <AbyssalAura />
  }
  return null
}

function CelestialAura() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[2] overflow-hidden">
      {/* Rayons : un disque surdimensionné, ancré au-dessus de la carte */}
      <div
        className="absolute -inset-1/2 opacity-25 mix-blend-soft-light [animation:celestialRays_18s_linear_infinite]"
        style={{
          transformOrigin: '50% 25%',
          background:
            'repeating-conic-gradient(from 0deg at 50% 25%, var(--astral-gold) 0deg 2deg, transparent 2deg 15deg)',
          maskImage:
            'radial-gradient(circle at 50% 25%, black 0%, transparent 38%)',
        }}
      />
      {/* Lumière qui descend du haut */}
      <div
        className="absolute inset-0 mix-blend-screen [animation:auraBreath_4.5s_ease-in-out_infinite]"
        style={{
          background:
            'radial-gradient(ellipse 80% 55% at 50% 0%, color-mix(in oklab, var(--astral-day-cloud) 75%, transparent) 0%, color-mix(in oklab, var(--astral-day-haze) 30%, transparent) 45%, transparent 75%)',
        }}
      />
      {/* Liseré doré */}
      <div
        className="absolute inset-0 rounded-[inherit] [animation:auraBreath_4.5s_ease-in-out_infinite]"
        style={{
          boxShadow:
            'inset 0 0 22px color-mix(in oklab, var(--astral-gold) 65%, transparent)',
        }}
      />
    </div>
  )
}

function AbyssalAura() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[2] overflow-hidden">
      {/* Vignette : les bords s'enfoncent dans le noir */}
      <div
        className="absolute inset-0 mix-blend-multiply"
        style={{
          background:
            'radial-gradient(ellipse 75% 70% at 50% 45%, transparent 25%, color-mix(in oklab, var(--astral-night-deep) 95%, transparent) 100%)',
        }}
      />
      {/* Fumée violette et rose qui dérive */}
      <div
        className="absolute inset-0 opacity-40 mix-blend-soft-light [background-size:220%_220%] [animation:abyssDrift_16s_ease-in-out_infinite]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 80%, color-mix(in oklab, var(--astral-night-violet) 55%, transparent) 0%, transparent 30%), radial-gradient(circle at 75% 70%, color-mix(in oklab, var(--astral-night-pink) 35%, transparent) 0%, transparent 25%), radial-gradient(circle at 60% 15%, color-mix(in oklab, var(--astral-night-violet) 35%, transparent) 0%, transparent 25%)',
        }}
      />
      {/* Lueur violette sur les bords */}
      <div
        className="absolute inset-0 rounded-[inherit] [animation:auraBreath_5s_ease-in-out_infinite]"
        style={{
          boxShadow:
            'inset 0 0 30px color-mix(in oklab, var(--astral-night-deep) 85%, transparent), inset 0 0 8px color-mix(in oklab, var(--astral-night-violet) 80%, transparent)',
        }}
      />
    </div>
  )
}
