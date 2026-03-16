import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/play')({
  component: Play,
})

function Play() {
  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center overflow-hidden bg-background p-8">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-5%] h-[400px] w-[400px] rounded-full bg-primary/8 blur-[110px]" />
        <div className="absolute right-[-8%] bottom-[10%] h-[350px] w-[350px] rounded-full bg-secondary/6 blur-[100px]" />
      </div>

      <div className="relative z-10 text-center">
        <div
          className="mb-8 inline-block text-8xl float"
          style={{ '--float-rotate': '0deg' } as React.CSSProperties}
        >
          🎰
        </div>
        <h1 className="mb-4 text-4xl font-black bg-gradient-to-r from-primary via-primary-light to-secondary bg-clip-text text-transparent">
          La machine arrive bientôt
        </h1>
        <p className="max-w-sm text-text-light leading-relaxed">
          Prépare-toi à jouer à la machine à capsules 3D et à collecter des
          figurines rares !
        </p>

        <div className="mt-8 flex items-center justify-center gap-2">
          {['Commun', 'Rare', 'Épique', 'Légendaire'].map((rarity, i) => (
            <span
              key={rarity}
              className={`rounded-full px-3 py-1 text-xs font-semibold border ${
                i === 0
                  ? 'border-border text-text-light bg-muted'
                  : i === 1
                    ? 'border-accent/30 text-accent bg-accent/10'
                    : i === 2
                      ? 'border-secondary/30 text-secondary bg-secondary/10'
                      : 'border-primary/30 text-primary bg-primary/10'
              }`}
            >
              {rarity}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
