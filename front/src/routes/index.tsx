import { createFileRoute, Link, redirect } from '@tanstack/react-router'

import { useAuthStore } from '../stores/auth.store.js'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    if (useAuthStore.getState().isAuthenticated) {
      throw redirect({ to: '/play' })
    }
  },
  component: LandingPage,
})

const features = [
  {
    icon: '🎰',
    title: 'Machine à pince 3D',
    desc: 'Attrape des boules mystères avec une vraie machine en 3D interactive.',
    gradientFrom: 'from-primary/15',
    gradientTo: 'to-primary/5',
    border: 'border-primary/20',
    iconBg: 'bg-primary/10',
  },
  {
    icon: '✨',
    title: 'Raretés & variantes',
    desc: 'Commun, Rare, Épique, Légendaire… et des cartes Holographiques.',
    gradientFrom: 'from-secondary/15',
    gradientTo: 'to-secondary/5',
    border: 'border-secondary/20',
    iconBg: 'bg-secondary/10',
  },
  {
    icon: '👥',
    title: 'Équipes',
    desc: 'Rejoins des équipes, partage ta collection, rivalise au classement.',
    gradientFrom: 'from-accent/15',
    gradientTo: 'to-accent/5',
    border: 'border-accent/20',
    iconBg: 'bg-accent/10',
  },
]

function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6 py-20 text-foreground">
      {/* Ambient background orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-20%] top-[-10%] h-[600px] w-[600px] rounded-full bg-primary/8 blur-[140px]" />
        <div className="absolute right-[-15%] top-[25%] h-[500px] w-[500px] rounded-full bg-secondary/8 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[15%] h-[400px] w-[400px] rounded-full bg-accent/6 blur-[100px]" />
      </div>

      {/* Decorative floating capsules */}
      <div
        className="pointer-events-none absolute right-[8%] top-[15%] h-16 w-16 rounded-full bg-gradient-to-br from-primary/40 to-primary/10 blur-sm float"
        style={{ '--float-rotate': '15deg' } as React.CSSProperties}
      />
      <div
        className="pointer-events-none absolute left-[6%] top-[35%] h-10 w-10 rounded-full bg-gradient-to-br from-secondary/40 to-secondary/10 blur-sm float"
        style={
          {
            '--float-rotate': '-10deg',
            animationDelay: '-2s',
          } as React.CSSProperties
        }
      />
      <div
        className="pointer-events-none absolute bottom-[20%] right-[12%] h-12 w-12 rounded-full bg-gradient-to-br from-accent/40 to-accent/10 blur-sm float"
        style={
          {
            '--float-rotate': '5deg',
            animationDelay: '-4s',
          } as React.CSSProperties
        }
      />

      {/* Hero section */}
      <div className="relative z-10 flex flex-col items-center text-center">
        <h1 className="mb-6 max-w-3xl font-black leading-[1.1] tracking-tight text-5xl lg:text-7xl">
          <span className="bg-gradient-to-br from-foreground via-foreground/90 to-foreground/60 bg-clip-text text-transparent">
            Collecte.{' '}
          </span>
          <span className="bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">
            Affronte.{' '}
          </span>
          <span className="bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">
            Domine.
          </span>
        </h1>

        <p className="mb-10 max-w-lg text-lg leading-relaxed text-text-light">
          Lance la machine, obtiens des figurines rares, et rivalise avec tes
          équipes dans le classement mondial.
        </p>

        <div className="flex flex-wrap gap-4 justify-center">
          <Link
            to="/register"
            className="rounded-xl bg-primary px-8 py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-200 hover:bg-primary/85 hover:shadow-primary/35 hover:shadow-xl hover:-translate-y-0.5"
          >
            Commencer à jouer
          </Link>
          <Link
            to="/login"
            className="rounded-xl border border-border bg-card/60 px-8 py-3.5 text-sm font-semibold text-text backdrop-blur transition-all duration-200 hover:border-primary/30 hover:bg-muted hover:-translate-y-0.5"
          >
            Se connecter
          </Link>
        </div>
      </div>

      {/* Feature cards */}
      <div className="relative z-10 mt-24 grid w-full max-w-4xl grid-cols-1 gap-5 sm:grid-cols-3">
        {features.map(
          ({ icon, title, desc, gradientFrom, gradientTo, border, iconBg }) => (
            <div
              key={title}
              className={`rounded-2xl border ${border} bg-gradient-to-b ${gradientFrom} ${gradientTo} p-6 backdrop-blur transition-transform duration-300 hover:-translate-y-1`}
            >
              <div
                className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${iconBg} text-2xl`}
              >
                {icon}
              </div>
              <h3 className="mb-2 text-base font-bold text-text">{title}</h3>
              <p className="text-sm leading-relaxed text-text-light">{desc}</p>
            </div>
          ),
        )}
      </div>
    </div>
  )
}
