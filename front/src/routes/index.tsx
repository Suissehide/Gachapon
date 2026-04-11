import { createFileRoute } from '@tanstack/react-router'
import { ChevronDown, Package, Sparkles, User, Users } from 'lucide-react'
import { type CSSProperties } from 'react'
import { Helmet } from 'react-helmet-async'

import { LandingNavbar } from '../components/custom/LandingNavbar.tsx'
import { useAuthDialogStore } from '../stores/authDialog.store'
import { Button } from '../components/ui/button.tsx'
import { Card } from '../components/ui/card.tsx'

export const Route = createFileRoute('/')({
  component: LandingPage,
})

// ── Ball palette ──────────────────────────────────────────────────────────────

const BALLS = {
  amber: {
    bg: 'radial-gradient(circle at 35% 35%, #fde68a 0%, #f59e0b 50%, #92400e 100%)',
    shadow: '0 6px 20px rgba(217,119,6,0.4)',
  },
  purple: {
    bg: 'radial-gradient(circle at 35% 35%, #ddd6fe 0%, #7c3aed 50%, #3b0764 100%)',
    shadow: '0 6px 20px rgba(124,58,237,0.4)',
  },
  cyan: {
    bg: 'radial-gradient(circle at 35% 35%, #a5f3fc 0%, #0891b2 50%, #0c4a6e 100%)',
    shadow: '0 6px 20px rgba(8,145,178,0.35)',
  },
  pink: {
    bg: 'radial-gradient(circle at 35% 35%, #fce7f3 0%, #ec4899 50%, #831843 100%)',
    shadow: '0 6px 20px rgba(236,72,153,0.35)',
  },
  green: {
    bg: 'radial-gradient(circle at 35% 35%, #bbf7d0 0%, #22c55e 50%, #14532d 100%)',
    shadow: '0 5px 16px rgba(34,197,94,0.3)',
  },
  holo: {
    bg: 'radial-gradient(circle at 35% 35%, #f0abfc 0%, #818cf8 45%, #22d3ee 100%)',
    shadow: '0 6px 20px rgba(129,140,248,0.4)',
  },
  silver: {
    bg: 'radial-gradient(circle at 35% 35%, #f1f5f9 0%, #94a3b8 50%, #334155 100%)',
    shadow: '0 4px 14px rgba(100,116,139,0.25)',
  },
}

// ── Marquee strip ─────────────────────────────────────────────────────────────

function MarqueeStrip({
  words,
  reverse = false,
  speed = 30,
}: {
  words: string[]
  reverse?: boolean
  speed?: number
}) {
  // Render exactly TWO identical units and translate -50% for a seamless loop.
  const sentence = words.join('   ')
  const unit = (
    <span
      className="mx-6 text-[clamp(14rem,20vw,17rem)] font-black uppercase select-none tracking-tight leading-none"
      style={{
        color: 'var(--background)',
        WebkitTextStroke: '1.5px var(--primary)',
      }}
    >
      {sentence}
    </span>
  )

  return (
    <div className="border-t border-border/30 overflow-hidden py-5 my-2">
      <div
        className="flex w-max"
        style={{
          animation: `marquee ${speed}s linear infinite ${reverse ? 'reverse' : ''}`,
          willChange: 'transform',
        }}
      >
        <span className="flex shrink-0">{unit}</span>
        <span className="flex shrink-0" aria-hidden="true">
          {unit}
        </span>
      </div>
    </div>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────

// ── Floating balls config ─────────────────────────────────────────────────────

const FLOATING_BALLS: Array<{
  bg: string
  shadow: string
  s: number
  top?: string
  bottom?: string
  left?: string
  right?: string
  delay: string
  rotate: string
  id: string
}> = [
  {
    ...BALLS.amber,
    s: 64,
    top: '18%',
    left: '5%',
    delay: '0s',
    rotate: '12deg',
    id: 'a',
  },
  {
    ...BALLS.purple,
    s: 46,
    top: '26%',
    right: '6%',
    delay: '-1.5s',
    rotate: '-10deg',
    id: 'b',
  },
  {
    ...BALLS.cyan,
    s: 30,
    top: '55%',
    left: '3%',
    delay: '-3.8s',
    rotate: '8deg',
    id: 'c',
  },
  {
    ...BALLS.pink,
    s: 50,
    top: '44%',
    right: '4%',
    delay: '-2.2s',
    rotate: '-14deg',
    id: 'd',
  },
  {
    ...BALLS.green,
    s: 22,
    bottom: '18%',
    right: '11%',
    delay: '-0.8s',
    rotate: '20deg',
    id: 'e',
  },
  {
    ...BALLS.holo,
    s: 16,
    top: '36%',
    left: '14%',
    delay: '-4.2s',
    rotate: '-5deg',
    id: 'f',
  },
]

// ── Component ─────────────────────────────────────────────────────────────────

function LandingPage() {
  const { openLogin, openRegister } = useAuthDialogStore()

  return (
    <div className="relative flex flex-col min-h-screen bg-background text-foreground overflow-x-hidden">
      <Helmet>
        <title>Gachapon — Attrape. Collectionne. Échange.</title>
        <meta name="description" content="Gachapon transforme le plaisir de collection en une expérience élégante, immersive et sociale. Tire des capsules, découvre des cartes rares et construis ta collection." />
        <link rel="canonical" href="https://gachapon.qwetle.fr/" />
        <meta property="og:title" content="Gachapon — Attrape. Collectionne. Échange." />
        <meta property="og:description" content="Gachapon transforme le plaisir de collection en une expérience élégante, immersive et sociale. Tire des capsules, découvre des cartes rares et construis ta collection." />
        <meta property="og:url" content="https://gachapon.qwetle.fr/" />
      </Helmet>
      {/* Dot grid */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          backgroundImage:
            'radial-gradient(circle, var(--border) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          opacity: 0.4,
        }}
      />

      {/* Ambient orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute -left-[25%] -top-[15%] h-175 w-175 rounded-full bg-primary/8 blur-[160px]" />
        <div className="absolute -right-[20%] top-[30%] h-150 w-150 rounded-full bg-secondary/7 blur-[140px]" />
        <div className="absolute left-[20%] bottom-[-10%] h-125 w-125 rounded-full bg-accent/5 blur-[120px]" />
      </div>

      <LandingNavbar />

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <section className="relative z-10 h-screen flex flex-col items-center text-center px-6 pt-32 pb-8">
        {/* Floating balls */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {FLOATING_BALLS.map((b) => (
            <div
              key={b.id}
              className="absolute rounded-full float"
              style={
                {
                  width: b.s,
                  height: b.s,
                  top: b.top,
                  bottom: b.bottom,
                  left: b.left,
                  right: b.right,
                  background: b.bg,
                  boxShadow: b.shadow,
                  animationDelay: b.delay,
                  '--float-rotate': b.rotate,
                } as CSSProperties
              }
            />
          ))}
        </div>

        <div className="h-full flex flex-col justify-between">
          <div className="flex flex-col items-center">
            <p
              className="text-[11px] font-semibold text-text-light/50 uppercase tracking-[0.2em] mb-6 animate-in fade-in-0 duration-700 fill-mode-both"
              style={{ animationDelay: '100ms' }}
            >
              Attrape. Collectionne. Échange.
            </p>

            <h1
              className="mb-6 max-w-3xl font-black leading-[0.95] tracking-tight text-[clamp(3.2rem,8vw,6rem)] animate-in fade-in-0 slide-in-from-bottom-6 duration-700 fill-mode-both"
              style={{ animationDelay: '220ms' }}
            >
              Une nouvelle manière
              <br />
              <span className="bg-linear-to-r from-primary via-yellow-500 to-primary-light bg-clip-text text-transparent">
                de collectionner.
              </span>
            </h1>

            <p
              className="mb-10 max-w-md text-base lg:text-lg leading-relaxed text-text-light animate-in fade-in-0 slide-in-from-bottom-6 duration-700 fill-mode-both"
              style={{ animationDelay: '380ms' }}
            >
              Gachapon transforme le plaisir de collection en une expérience
              élégante, immersive et profondément sociale. Chaque tirage,
              mémorable.
            </p>

            <div
              className="flex flex-col items-center gap-6 animate-in fade-in-0 slide-in-from-bottom-6 duration-700 fill-mode-both"
              style={{ animationDelay: '520ms' }}
            >
              <Button
                size="lg"
                onClick={openRegister}
                className="rounded-full px-8 shadow-lg shadow-primary/20"
              >
                Rejoindre Gachapon
              </Button>
            </div>
          </div>

          <a
            href="#experience"
            className="flex flex-col items-center gap-1.5 text-xs text-text-light/50 hover:text-text-light transition-colors"
            aria-label="Défiler vers la suite"
          >
            <ChevronDown className="h-5 w-5 animate-bounce" />
          </a>
        </div>
      </section>

      {/* ── MARQUEE 1 ─────────────────────────────────────────────── */}
      <MarqueeStrip words={['CAPSULES', 'CAPSULES', 'CAPSULES']} speed={20} />

      {/* ── EXPÉRIENCE ────────────────────────────────────────────── */}
      <section id="experience" className="relative z-10 px-6 lg:px-10 py-8">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
          {/* Left: heading */}
          <div className="lg:sticky lg:top-32">
            <p className="text-[11px] font-semibold text-text-light/50 uppercase tracking-[0.15em] mb-4">
              L'expérience
            </p>
            <h2 className="font-black leading-[0.88] tracking-tight text-[clamp(3rem,7vw,6rem)] text-foreground">
              Une
              <br />
              <span className="text-primary">expérience</span>
              <br />
              maîtrisée.
            </h2>

            {/* Ball cluster */}
            <div className="flex items-center gap-3 mt-8">
              {(['amber', 'purple', 'cyan'] as const).map((name, i) => (
                <div
                  key={name}
                  className="rounded-full"
                  style={{
                    width: 28 + i * 8,
                    height: 28 + i * 8,
                    background: BALLS[name].bg,
                    boxShadow: BALLS[name].shadow,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Right: stacked phrases + body */}
          <div className="flex flex-col">
            {(['Un geste.', 'Une capture.', 'Une découverte.'] as const).map(
              (phrase) => (
                <div
                  key={phrase}
                  className="border-t border-border/40 py-5 last:border-b last:border-border/40"
                >
                  <p className="text-[clamp(1.8rem,4vw,2.8rem)] font-black text-foreground leading-none tracking-tight">
                    {phrase}
                  </p>
                </div>
              ),
            )}

            <p className="mt-8 text-sm leading-relaxed text-text-light max-w-sm">
              Chaque jour, recevez vos tokens et accédez à une machine à pince
              3D, conçue pour offrir un moment de tension et de révélation
              unique. Rien n'est laissé au hasard, sauf ce qui doit l'être.
            </p>
          </div>
        </div>
      </section>

      {/* ── RARETÉ ────────────────────────────────────────────────── */}
      <section className="relative z-10 px-6 lg:px-10 pb-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-12">
            <p className="text-[11px] font-semibold text-text-light/50 uppercase tracking-[0.15em] mb-4">
              Les variantes
            </p>
            <h2 className="font-black leading-[0.88] tracking-tight text-[clamp(3rem,7vw,6rem)] text-foreground">
              La rareté,
              <br />
              <span className="text-secondary">redéfinie.</span>
            </h2>
            <p className="mt-6 text-sm text-text-light max-w-sm leading-relaxed">
              Tu as des doublons ? Transforme-les en poussière ou échange-les
              avec d’autres joueurs pour compléter ta collection plus vite. Le
              vrai défi, ce n’est pas d’obtenir des icônes... c’est d’obtenir
              les bonnes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                ball: BALLS.silver,
                name: 'Standard',
                desc: 'La forme essentielle. Une base soignée, où chaque détail compte.',
              },
              {
                ball: BALLS.holo,
                name: 'Holographique',
                desc: 'Des reflets subtils qui évoluent avec la lumière. Une présence plus vivante.',
              },
              {
                ball: BALLS.amber,
                name: 'Brillante',
                desc: 'Une intensité rare. Animations, éclat et profondeur pour une révélation inoubliable.',
              },
            ].map(({ ball, name, desc }) => (
              <Card
                key={name}
                className="p-7 border-border/50 relative overflow-hidden group"
              >
                <div
                  className="absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-20 group-hover:opacity-30 transition-opacity duration-300"
                  style={{ background: ball.bg }}
                />
                <div
                  className="h-10 w-10 rounded-full mb-5"
                  style={{ background: ball.bg, boxShadow: ball.shadow }}
                />
                <h3 className="text-sm font-black text-foreground mb-2">
                  {name}
                </h3>
                <p className="text-sm leading-relaxed text-text-light">
                  {desc}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── MARQUEE 2 ─────────────────────────────────────────────── */}
      <MarqueeStrip
        words={['COLLECTION', 'RARETÉ', 'DÉCOUVERTE']}
        reverse
        speed={24}
      />

      {/* ── COLLECTIF + COLLECTION ────────────────────────────────── */}
      <section className="relative z-10 px-6 lg:px-10 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-12">
            <p className="text-[11px] font-semibold text-text-light/50 uppercase tracking-[0.15em] mb-4">
              Ensemble
            </p>
            <h2 className="font-black leading-[0.88] tracking-tight text-[clamp(3rem,7vw,6rem)] text-foreground">
              Pensé pour
              <br />
              <span className="text-accent">le collectif.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Équipes */}
            <Card className="lg:col-span-3 p-8 border-secondary/20 bg-linear-to-br from-secondary/6 via-card to-card relative overflow-hidden">
              <div
                className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-15"
                style={{ background: BALLS.purple.bg }}
              />
              <Users className="h-5 w-5 text-secondary mb-5 relative z-10" />
              <h3 className="text-base font-black text-foreground mb-3 relative z-10">
                Équipes
              </h3>
              <p className="text-sm leading-relaxed text-text-light relative z-10 max-w-sm">
                Créez une équipe restreinte, comparez, progressez ensemble.
                Gachapon n'est pas seulement une expérience individuelle — c'est
                un espace d'échange, de stratégie et d'observation.
              </p>
            </Card>

            {/* Collection vivante */}
            <Card className="lg:col-span-2 p-8 border-accent/20 bg-linear-to-br from-accent/6 via-card to-card relative overflow-hidden">
              <div
                className="absolute -right-4 -bottom-4 h-16 w-16 rounded-full opacity-15"
                style={{ background: BALLS.cyan.bg }}
              />
              <Package className="h-5 w-5 text-accent mb-5 relative z-10" />
              <h3 className="text-sm font-black text-foreground mb-3 relative z-10">
                Collection vivante
              </h3>
              <p className="text-sm leading-relaxed text-text-light relative z-10">
                Construisez au fil du temps, complétez des ensembles. Les pièces
                manquantes restent visibles, en attente — elles racontent ce
                qu'il reste à accomplir.
              </p>
            </Card>

            {/* Économie */}
            <Card className="lg:col-span-2 p-7 border-border/50">
              <Sparkles className="h-5 w-5 text-foreground/60 mb-4" />
              <h3 className="text-sm font-black text-foreground mb-3">
                Une économie maîtrisée
              </h3>
              <div className="flex flex-col gap-2">
                {[
                  'Les doublons deviennent de la poussière',
                  'La poussière ouvre de nouvelles possibilités',
                  'Chaque décision a un impact',
                ].map((line) => (
                  <p
                    key={line}
                    className="text-sm text-text-light leading-relaxed flex items-start gap-2"
                  >
                    <span className="text-primary mt-0.5 shrink-0">—</span>
                    {line}
                  </p>
                ))}
              </div>
            </Card>

            {/* Identité */}
            <Card className="lg:col-span-3 p-7 border-border/50 relative overflow-hidden">
              <div
                className="absolute -right-6 top-1/2 -translate-y-1/2 h-20 w-20 rounded-full opacity-10"
                style={{ background: BALLS.holo.bg }}
              />
              <User className="h-5 w-5 text-amber-600 mb-4" />
              <h3 className="text-sm font-black text-foreground mb-3 relative z-10">
                Une identité visible
              </h3>
              <p className="text-sm leading-relaxed text-text-light relative z-10">
                Chaque profil est une signature. Collections visibles, pièces
                rares mises en avant, progression mesurable. Vous ne
                collectionnez pas seulement des icônes — vous construisez une
                présence.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* ── MARQUEE 3 ─────────────────────────────────────────────── */}
      <MarqueeStrip words={['GACHAPON', 'GACHAPON', 'GACHAPON']} speed={20} />

      {/* ── CTA ───────────────────────────────────────────────────── */}
      <section className="relative z-10 px-6 py-8">
        <div className="max-w-2xl mx-auto relative">
          {/* Surrounding balls */}
          <div
            className="absolute -left-12 top-1/2 -translate-y-1/2 h-20 w-20 rounded-full pointer-events-none hidden lg:block"
            style={{
              background: BALLS.amber.bg,
              boxShadow: BALLS.amber.shadow,
            }}
          />
          <div
            className="absolute -right-10 top-8 h-14 w-14 rounded-full pointer-events-none hidden lg:block"
            style={{
              background: BALLS.purple.bg,
              boxShadow: BALLS.purple.shadow,
            }}
          />
          <div
            className="absolute -right-4 bottom-10 h-9 w-9 rounded-full pointer-events-none hidden lg:block"
            style={{ background: BALLS.pink.bg, boxShadow: BALLS.pink.shadow }}
          />

          <Card className="text-center p-14 bg-linear-to-b from-card to-background border-border/50 relative z-10">
            <h2 className="font-black leading-[0.9] tracking-tight text-[clamp(2.8rem,6vw,4.5rem)] text-foreground mb-4">
              Commencez.
            </h2>
            <p className="text-base text-text-light mb-2">
              L'accès est immédiat.
            </p>
            <p className="text-base text-text-light mb-10">
              Prêt à tenter ta chance ?
            </p>
            <Button
              size="lg"
              onClick={openRegister}
              className="rounded-full px-10 shadow-lg shadow-primary/20"
            >
              Rejoindre Gachapon
            </Button>
          </Card>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-border/40 bg-card/40 backdrop-blur px-6 lg:px-10 pt-10 pb-8">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="h-5 w-5 rounded-full shrink-0"
                  style={{
                    background: BALLS.amber.bg,
                    boxShadow: BALLS.amber.shadow,
                  }}
                />
                <span className="text-base font-black text-foreground">
                  Gachapon
                </span>
              </div>
              <p className="text-xs text-text-light leading-relaxed max-w-50">
                Attrape. Collectionne. Échange. Une expérience élégante,
                immersive et sociale.
              </p>
            </div>

            {/* Links */}
            <div>
              <p className="text-[11px] font-semibold text-text-light/50 uppercase tracking-[0.12em] mb-3">
                Accès
              </p>
              <nav className="flex flex-col items-start gap-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={openRegister}
                  className="h-auto px-0 py-1 text-xs text-text-light justify-start"
                >
                  Créer un compte
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={openLogin}
                  className="h-auto px-0 py-1 text-xs text-text-light justify-start"
                >
                  Se connecter
                </Button>
              </nav>
            </div>

            {/* Variants */}
            <div>
              <p className="text-[11px] font-semibold text-text-light/50 uppercase tracking-[0.12em] mb-3">
                Variantes
              </p>
              <div className="flex flex-col gap-2">
                {[
                  { label: 'Standard', ball: BALLS.silver },
                  { label: 'Holographique', ball: BALLS.holo },
                  { label: 'Brillante', ball: BALLS.amber },
                ].map(({ label, ball }) => (
                  <div key={label} className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ background: ball.bg }}
                    />
                    <span className="text-xs text-text-light">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom */}
          <div className="pt-6 border-t border-border/30 flex items-center justify-between flex-wrap gap-3">
            <p className="text-xs text-text-light/40">
              © 2026 Gachapon. Tous droits réservés.
            </p>
            <div className="flex items-center gap-3">
              {(['amber', 'purple', 'cyan', 'pink', 'holo'] as const).map(
                (name) => (
                  <div
                    key={name}
                    className="h-3 w-3 rounded-full"
                    style={{
                      background: BALLS[name].bg,
                      boxShadow: BALLS[name].shadow,
                    }}
                  />
                ),
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
