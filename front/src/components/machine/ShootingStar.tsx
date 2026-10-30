// Durée totale (traversée + impact) : play.tsx attend ce délai avant de
// lancer la capsule, l'animation CSS est calée dessus.
export const SHOOTING_STAR_MS = 1000

// Étoile filante de la capsule astrale : une traînée traverse l'écran en
// diagonale et plonge vers le centre de son conteneur (la machine), puis un
// éclat marque l'impact. Purement CSS ; montée seulement pendant la séquence.
export function ShootingStar() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute top-1/2 left-1/2 z-10"
    >
      <div className="absolute rotate-[35deg]">
        <div
          className="absolute top-0 right-0 h-1 w-56 origin-right -translate-y-1/2 animate-[shootingStarFly_650ms_cubic-bezier(0.55,0,0.85,0.35)_forwards] rounded-full"
          style={{
            background:
              'linear-gradient(90deg, transparent, var(--astral-night-violet) 45%, var(--astral-gold) 90%, white)',
            boxShadow: '0 0 12px var(--astral-gold)',
          }}
        />
      </div>
      <div
        className="absolute h-40 w-40 -translate-x-1/2 -translate-y-1/2 animate-[shootingStarImpact_1000ms_ease-out_forwards] rounded-full opacity-0"
        style={{
          background:
            'radial-gradient(circle, white 0%, var(--astral-gold) 22%, color-mix(in oklab, var(--astral-night-violet) 55%, transparent) 50%, transparent 72%)',
        }}
      />
    </div>
  )
}
