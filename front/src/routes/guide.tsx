import { createFileRoute, Link } from '@tanstack/react-router'
import {
  Award,
  BatteryCharging,
  BookOpen,
  ChevronRight,
  ChevronsUp,
  Coins,
  Crown,
  Flame,
  Gauge,
  Gift,
  Layers,
  LifeBuoy,
  ListChecks,
  Network,
  Sparkles,
  Star,
  Store,
  Swords,
  Ticket,
  Users,
  Wallet,
  Zap,
} from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'
import { Trans, useTranslation } from 'react-i18next'

import { LandingNavbar } from '../components/custom/LandingNavbar'
import { SeoHead } from '../components/shared/SeoHead.tsx'
import { useAuthDialogStore } from '../stores/authDialog.store'

export const Route = createFileRoute('/guide')({
  component: GuidePage,
})

// Les ids sont stables : ils pilotent les ancres `#<id>` et sont indépendants
// de la langue. Les libellés viennent de `guide:sectionLabels.<id>`.
const SECTION_IDS = [
  'monnaies',
  'tokens',
  'pulls',
  'rarete',
  'piete',
  'doublon',
  'boutique',
  'niveaux',
  'competences',
  'campagne',
  'combat-points',
  'cartes',
  'quetes',
  'succes',
  'chaine',
  'recompenses',
  'classements',
  'collection',
  'equipes',
  'api',
] as const

function Section({
  id,
  icon: Icon,
  title,
  children,
}: {
  id: string
  icon: ComponentType<{ className?: string }>
  title: string
  children: ReactNode
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 py-10 border-b border-border/30 last:border-0"
    >
      <div className="flex items-center gap-3 mb-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </span>
        <h2 className="text-xl font-black text-foreground">{title}</h2>
      </div>
      <div className="text-sm text-text-light leading-relaxed space-y-3 pl-11">
        {children}
      </div>
    </section>
  )
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block text-xs font-mono font-semibold px-2 py-0.5 rounded bg-muted border border-border/50 text-foreground/70">
      {children}
    </span>
  )
}

function RarityBadge({ rarity, color }: { rarity: string; color: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${color}`}
    >
      {rarity}
    </span>
  )
}

function InfoBox({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-xs leading-relaxed">
      {children}
    </div>
  )
}

function TipBox({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-600 leading-relaxed">
      {children}
    </div>
  )
}

function Currency({
  icon: Icon,
  name,
  color,
  children,
}: {
  icon: ComponentType<{ className?: string }>
  name: string
  color: string
  children: ReactNode
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-card px-4 py-3">
      <p className="font-semibold text-foreground mb-1 flex items-center gap-2">
        <Icon className={`h-4 w-4 ${color}`} />
        {name}
      </p>
      <p>{children}</p>
    </div>
  )
}

function GuidePage() {
  const { openRegister } = useAuthDialogStore()
  const { t } = useTranslation(['guide', 'discord'])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SeoHead path="/guide" />
      <LandingNavbar />

      <div className="pt-32 pb-24 px-6 lg:px-10 max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-12">
          <p className="text-[11px] font-semibold text-text-light/50 uppercase tracking-[0.2em] mb-4">
            {t('meta.eyebrow')}
          </p>
          <h1 className="text-5xl font-black tracking-tight mb-4">
            {t('header.title')}
          </h1>
          <p className="text-base text-text-light leading-relaxed max-w-xl">
            <Trans
              t={t}
              i18nKey="header.intro"
              components={{
                collect: <strong />,
                battle: <strong />,
              }}
            />
          </p>
        </header>

        <div className="flex flex-col lg:flex-row gap-10">
          {/* Table of contents — sticky sidebar */}
          <aside className="lg:w-52 shrink-0">
            <nav className="lg:sticky lg:top-24">
              <p className="text-[10px] font-semibold text-text-light/40 uppercase tracking-widest mb-3">
                {t('toc.heading')}
              </p>
              <ul className="space-y-1">
                {SECTION_IDS.map((id) => (
                  <li key={id}>
                    <a
                      href={`#${id}`}
                      className="flex items-center gap-1.5 text-xs text-text-light hover:text-foreground transition-colors py-0.5"
                    >
                      <ChevronRight className="h-3 w-3 shrink-0 text-primary/40" />
                      {t(`sectionLabels.${id}`)}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          {/* Content */}
          <main className="flex-1 min-w-0">
            {/* Les monnaies */}
            <Section
              id="monnaies"
              icon={Wallet}
              title={t('sectionLabels.monnaies')}
            >
              <p>
                <Trans
                  t={t}
                  i18nKey="sections.monnaies.intro"
                  components={{
                    strong: <strong className="text-foreground" />,
                  }}
                />
              </p>
              <div className="grid gap-3 sm:grid-cols-2 mt-1">
                <Currency
                  icon={Ticket}
                  name={t('sections.monnaies.currencies.gachaTokens.name')}
                  color="text-primary"
                >
                  {t('sections.monnaies.currencies.gachaTokens.description')}
                </Currency>
                <Currency
                  icon={Sparkles}
                  name={t('sections.monnaies.currencies.dust.name')}
                  color="text-sky-400"
                >
                  {t('sections.monnaies.currencies.dust.description')}
                </Currency>
                <Currency
                  icon={Coins}
                  name={t('sections.monnaies.currencies.gold.name')}
                  color="text-amber-400"
                >
                  <Trans
                    t={t}
                    i18nKey="sections.monnaies.currencies.gold.description"
                    components={{
                      strong: <strong className="text-foreground" />,
                    }}
                  />
                </Currency>
                <Currency
                  icon={BatteryCharging}
                  name={t('sections.monnaies.currencies.combatPoints.name')}
                  color="text-emerald-400"
                >
                  {t('sections.monnaies.currencies.combatPoints.description')}
                </Currency>
                <Currency
                  icon={Gauge}
                  name={t('sections.monnaies.currencies.xp.name')}
                  color="text-violet-400"
                >
                  {t('sections.monnaies.currencies.xp.description')}
                </Currency>
                <Currency
                  icon={Network}
                  name={t('sections.monnaies.currencies.skillPoints.name')}
                  color="text-fuchsia-400"
                >
                  {t('sections.monnaies.currencies.skillPoints.description')}
                </Currency>
              </div>
            </Section>

            {/* Tokens */}
            <Section
              id="tokens"
              icon={Ticket}
              title={t('sectionLabels.tokens')}
            >
              <p>
                <Trans
                  t={t}
                  i18nKey="sections.tokens.intro"
                  components={{
                    strong: <strong className="text-foreground" />,
                  }}
                />
              </p>
              <ul className="space-y-1.5">
                <li>
                  •{' '}
                  <Trans
                    t={t}
                    i18nKey="sections.tokens.capBullet"
                    components={{
                      strong: <strong className="text-foreground" />,
                    }}
                  />
                </li>
                <li>• {t('sections.tokens.regenBullet')}</li>
                <li>
                  •{' '}
                  <Trans
                    t={t}
                    i18nKey="sections.tokens.topbarBullet"
                    components={{
                      strong: <strong className="text-foreground" />,
                    }}
                  />
                </li>
              </ul>
              <InfoBox>
                <Trans
                  t={t}
                  i18nKey="sections.tokens.info"
                  components={{ strong: <strong /> }}
                />
              </InfoBox>
              <TipBox>{t('sections.tokens.tip')}</TipBox>
            </Section>

            {/* Pulls */}
            <Section id="pulls" icon={Zap} title={t('sectionLabels.pulls')}>
              <p>
                <Trans
                  t={t}
                  i18nKey="sections.pulls.intro"
                  components={{
                    strong: <strong className="text-foreground" />,
                  }}
                />
              </p>
              <ul className="space-y-1.5">
                <li>• {t('sections.pulls.instantBullet')}</li>
                <li>• {t('sections.pulls.resultBullet')}</li>
                <li>
                  •{' '}
                  <Trans
                    t={t}
                    i18nKey="sections.pulls.pityBullet"
                    components={{
                      strong: <strong className="text-foreground" />,
                    }}
                  />
                </li>
              </ul>
              <p>
                <Trans
                  t={t}
                  i18nKey="sections.pulls.skillsParagraph"
                  components={{
                    rareBadge: (
                      <RarityBadge
                        rarity="RARE"
                        color="border-blue-500/30 bg-blue-500/10 text-blue-400"
                      />
                    ),
                    epicBadge: (
                      <RarityBadge
                        rarity="EPIC"
                        color="border-violet-500/30 bg-violet-500/10 text-violet-400"
                      />
                    ),
                    legendaryBadge: (
                      <RarityBadge
                        rarity="LEGENDARY"
                        color="border-amber-500/30 bg-amber-500/10 text-amber-400"
                      />
                    ),
                    freePull: <strong className="text-foreground" />,
                    goldenBall: <strong className="text-foreground" />,
                  }}
                />
              </p>
            </Section>

            {/* Raretés & variantes */}
            <Section id="rarete" icon={Star} title={t('sectionLabels.rarete')}>
              <p>{t('sections.rarete.intro')}</p>
              <div className="flex flex-wrap gap-2 my-2">
                <RarityBadge
                  rarity="COMMON"
                  color="border-border bg-muted text-text-light"
                />
                <RarityBadge
                  rarity="UNCOMMON"
                  color="border-green-500/30 bg-green-500/10 text-green-400"
                />
                <RarityBadge
                  rarity="RARE"
                  color="border-blue-500/30 bg-blue-500/10 text-blue-400"
                />
                <RarityBadge
                  rarity="EPIC"
                  color="border-violet-500/30 bg-violet-500/10 text-violet-400"
                />
                <RarityBadge
                  rarity="LEGENDARY"
                  color="border-amber-500/30 bg-amber-500/10 text-amber-400"
                />
              </div>
              <p className="mt-3">
                <Trans
                  t={t}
                  i18nKey="sections.rarete.variantIntro"
                  components={{
                    strong1: <strong className="text-foreground" />,
                    strong2: <strong className="text-foreground" />,
                  }}
                />
              </p>
              <div className="space-y-2 mt-2">
                <div className="flex items-start gap-2">
                  <Pill>{t('sections.rarete.variants.normal.name')}</Pill>
                  <span>
                    {t('sections.rarete.variants.normal.description')}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Pill>{t('sections.rarete.variants.brilliant.name')}</Pill>
                  <span>
                    {t('sections.rarete.variants.brilliant.description')}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Pill>{t('sections.rarete.variants.holographic.name')}</Pill>
                  <span>
                    {t('sections.rarete.variants.holographic.description')}
                  </span>
                </div>
              </div>
              <p className="mt-2">{t('sections.rarete.ratesOutro')}</p>
            </Section>

            {/* Pitié */}
            <Section
              id="piete"
              icon={LifeBuoy}
              title={t('sectionLabels.piete')}
            >
              <p>{t('sections.piete.intro')}</p>
              <ul className="space-y-1.5">
                <li>
                  •{' '}
                  <Trans
                    t={t}
                    i18nKey="sections.piete.thresholdBullet"
                    components={{
                      strong: <strong className="text-foreground" />,
                    }}
                  />
                </li>
                <li>
                  •{' '}
                  <Trans
                    t={t}
                    i18nKey="sections.piete.resetBullet"
                    components={{
                      strong: <strong className="text-foreground" />,
                    }}
                  />
                </li>
                <li>• {t('sections.piete.personalBullet')}</li>
              </ul>
              <InfoBox>
                <Trans
                  t={t}
                  i18nKey="sections.piete.info"
                  components={{ strong: <strong /> }}
                />
              </InfoBox>
            </Section>

            {/* Doublons & poussière */}
            <Section
              id="doublon"
              icon={Sparkles}
              title={t('sectionLabels.doublon')}
            >
              <p>
                <Trans
                  t={t}
                  i18nKey="sections.doublon.intro"
                  components={{
                    strong: <strong className="text-foreground" />,
                    strong2: <strong className="text-foreground" />,
                  }}
                />
              </p>
              <ul className="space-y-1.5">
                <li>
                  •{' '}
                  <Trans
                    t={t}
                    i18nKey="sections.doublon.rarityBullet"
                    components={{
                      strong: <strong className="text-foreground" />,
                    }}
                  />
                </li>
                <li>
                  •{' '}
                  <Trans
                    t={t}
                    i18nKey="sections.doublon.variantsBullet"
                    components={{
                      brilliantPill: <Pill />,
                      holoPill: <Pill />,
                    }}
                  />
                </li>
                <li>
                  •{' '}
                  <Trans
                    t={t}
                    i18nKey="sections.doublon.recycleBullet"
                    components={{
                      strong: <strong className="text-foreground" />,
                    }}
                  />
                </li>
              </ul>
              <p>
                <Trans
                  t={t}
                  i18nKey="sections.doublon.usesParagraph"
                  components={{
                    strong1: <strong className="text-foreground" />,
                    strong2: <strong className="text-foreground" />,
                    strong3: <strong className="text-foreground" />,
                    strong4: <strong className="text-foreground" />,
                  }}
                />
              </p>
              <TipBox>{t('sections.doublon.tip')}</TipBox>
            </Section>

            {/* Boutique du jour & Vœu */}
            <Section
              id="boutique"
              icon={Store}
              title={t('sectionLabels.boutique')}
            >
              <p>
                <Trans
                  t={t}
                  i18nKey="sections.boutique.intro"
                  components={{
                    strong: <strong className="text-foreground" />,
                  }}
                />
              </p>
              <div className="space-y-3 mt-1">
                <div className="rounded-lg border border-border/50 bg-card px-4 py-3">
                  <p className="font-semibold text-foreground mb-1">
                    {t('sections.boutique.dailyShop.title')}
                  </p>
                  <p>
                    <Trans
                      t={t}
                      i18nKey="sections.boutique.dailyShop.description"
                      components={{
                        strong1: <strong className="text-foreground" />,
                        strong2: <strong className="text-foreground" />,
                      }}
                    />
                  </p>
                </div>
                <div className="rounded-lg border border-border/50 bg-card px-4 py-3">
                  <p className="font-semibold text-foreground mb-1">
                    {t('sections.boutique.wish.title')}
                  </p>
                  <p>
                    <Trans
                      t={t}
                      i18nKey="sections.boutique.wish.description"
                      components={{
                        strong1: <strong className="text-foreground" />,
                        strong2: <strong className="text-foreground" />,
                      }}
                    />
                  </p>
                </div>
              </div>
              <InfoBox>
                <Trans
                  t={t}
                  i18nKey="sections.boutique.info"
                  components={{
                    strong1: <strong />,
                    strong2: <strong />,
                  }}
                />
              </InfoBox>
            </Section>

            {/* Niveaux & XP */}
            <Section
              id="niveaux"
              icon={Gauge}
              title={t('sectionLabels.niveaux')}
            >
              <p>
                <Trans
                  t={t}
                  i18nKey="sections.niveaux.intro"
                  components={{
                    strong: <strong className="text-foreground" />,
                    strong2: <strong className="text-foreground" />,
                  }}
                />
              </p>
              <ul className="space-y-1.5">
                <li>• {t('sections.niveaux.curveBullet')}</li>
                <li>
                  •{' '}
                  <Trans
                    t={t}
                    i18nKey="sections.niveaux.skillPointsBullet"
                    components={{
                      strong: <strong className="text-foreground" />,
                    }}
                  />
                </li>
                <li>• {t('sections.niveaux.xpBoostBullet')}</li>
              </ul>
              <InfoBox>
                <Trans
                  t={t}
                  i18nKey="sections.niveaux.info"
                  components={{
                    strong1: <strong />,
                    strong2: <strong />,
                  }}
                />
              </InfoBox>
            </Section>

            {/* Arbre de compétences */}
            <Section
              id="competences"
              icon={Network}
              title={t('sectionLabels.competences')}
            >
              <p>
                <Trans
                  t={t}
                  i18nKey="sections.competences.intro"
                  components={{
                    strong: <strong className="text-foreground" />,
                    strong2: <strong className="text-foreground" />,
                    strong3: <strong className="text-foreground" />,
                  }}
                />
              </p>
              <p>{t('sections.competences.domainsIntro')}</p>
              <div className="space-y-3 mt-1">
                <div className="rounded-lg border border-border/50 bg-card px-4 py-3">
                  <p className="font-semibold text-foreground mb-1 flex items-center gap-2">
                    <Star className="h-4 w-4 text-primary" />{' '}
                    {t('sections.competences.domains.luck.title')}
                  </p>
                  <p>{t('sections.competences.domains.luck.description')}</p>
                </div>
                <div className="rounded-lg border border-border/50 bg-card px-4 py-3">
                  <p className="font-semibold text-foreground mb-1 flex items-center gap-2">
                    <Coins className="h-4 w-4 text-amber-400" />{' '}
                    {t('sections.competences.domains.economy.title')}
                  </p>
                  <p>{t('sections.competences.domains.economy.description')}</p>
                </div>
                <div className="rounded-lg border border-border/50 bg-card px-4 py-3">
                  <p className="font-semibold text-foreground mb-1 flex items-center gap-2">
                    <Gauge className="h-4 w-4 text-violet-400" />{' '}
                    {t('sections.competences.domains.progression.title')}
                  </p>
                  <p>
                    {t('sections.competences.domains.progression.description')}
                  </p>
                </div>
                <div className="rounded-lg border border-border/50 bg-card px-4 py-3">
                  <p className="font-semibold text-foreground mb-1 flex items-center gap-2">
                    <Swords className="h-4 w-4 text-emerald-400" />{' '}
                    {t('sections.competences.domains.combat.title')}
                  </p>
                  <p>{t('sections.competences.domains.combat.description')}</p>
                </div>
              </div>
              <InfoBox>
                <Trans
                  t={t}
                  i18nKey="sections.competences.info"
                  components={{ strong: <strong /> }}
                />
              </InfoBox>
            </Section>

            {/* Campagne & combats */}
            <Section
              id="campagne"
              icon={Swords}
              title={t('sectionLabels.campagne')}
            >
              <p>
                <Trans
                  t={t}
                  i18nKey="sections.campagne.intro"
                  components={{
                    strong: <strong className="text-foreground" />,
                    strong2: <strong className="text-foreground" />,
                    strong3: <strong className="text-foreground" />,
                  }}
                />
              </p>
              <ul className="space-y-1.5">
                <li>
                  •{' '}
                  <Trans
                    t={t}
                    i18nKey="sections.campagne.teamBullet"
                    components={{
                      strong: <strong className="text-foreground" />,
                      strong2: <strong className="text-foreground" />,
                    }}
                  />
                </li>
                <li>
                  •{' '}
                  <Trans
                    t={t}
                    i18nKey="sections.campagne.prepBullet"
                    components={{
                      strong: <strong className="text-foreground" />,
                      advantagePill: <Pill />,
                      evenPill: <Pill />,
                      riskyPill: <Pill />,
                    }}
                  />
                </li>
                <li>
                  •{' '}
                  <Trans
                    t={t}
                    i18nKey="sections.campagne.turnBasedBullet"
                    components={{
                      strong: <strong className="text-foreground" />,
                    }}
                  />
                </li>
              </ul>
              <p>
                <Trans
                  t={t}
                  i18nKey="sections.campagne.firstClearParagraph"
                  components={{
                    strong: <strong className="text-foreground" />,
                  }}
                />
              </p>
              <InfoBox>
                <Trans
                  t={t}
                  i18nKey="sections.campagne.info"
                  components={{ strong: <strong /> }}
                />
              </InfoBox>
            </Section>

            {/* Points de combat */}
            <Section
              id="combat-points"
              icon={BatteryCharging}
              title={t('sectionLabels.combat-points')}
            >
              <p>
                <Trans
                  t={t}
                  i18nKey="sections.combat-points.intro"
                  components={{
                    strong: <strong className="text-foreground" />,
                  }}
                />
              </p>
              <ul className="space-y-1.5">
                <li>
                  •{' '}
                  <Trans
                    t={t}
                    i18nKey="sections.combat-points.insufficientBullet"
                    components={{
                      strong: <strong className="text-foreground" />,
                    }}
                  />
                </li>
                <li>• {t('sections.combat-points.skillsBullet')}</li>
              </ul>
              <TipBox>{t('sections.combat-points.tip')}</TipBox>
            </Section>

            {/* Améliorer ses cartes */}
            <Section
              id="cartes"
              icon={ChevronsUp}
              title={t('sectionLabels.cartes')}
            >
              <p>{t('sections.cartes.intro')}</p>
              <div className="space-y-3 mt-1">
                <div className="rounded-lg border border-border/50 bg-card px-4 py-3">
                  <p className="font-semibold text-foreground mb-1">
                    {t('sections.cartes.level.title')}
                  </p>
                  <p>
                    <Trans
                      t={t}
                      i18nKey="sections.cartes.level.description"
                      components={{
                        strong: <strong className="text-foreground" />,
                      }}
                    />
                  </p>
                </div>
                <div className="rounded-lg border border-border/50 bg-card px-4 py-3">
                  <p className="font-semibold text-foreground mb-1">
                    {t('sections.cartes.ascension.title')}
                  </p>
                  <p>
                    <Trans
                      t={t}
                      i18nKey="sections.cartes.ascension.description"
                      components={{
                        strong1: <strong className="text-foreground" />,
                        strong2: <strong className="text-foreground" />,
                        strong3: <strong className="text-foreground" />,
                        strong4: <strong className="text-foreground" />,
                        strong5: <strong className="text-foreground" />,
                      }}
                    />
                  </p>
                </div>
                <div className="rounded-lg border border-border/50 bg-card px-4 py-3">
                  <p className="font-semibold text-foreground mb-1">
                    {t('sections.cartes.equipment.title')}
                  </p>
                  <p>
                    <Trans
                      t={t}
                      i18nKey="sections.cartes.equipment.description"
                      components={{
                        weaponPill: <Pill />,
                        armorPill: <Pill />,
                        accessoryPill: <Pill />,
                        strong: <strong className="text-foreground" />,
                      }}
                    />
                  </p>
                </div>
              </div>
              <TipBox>{t('sections.cartes.tip')}</TipBox>
            </Section>

            {/* Quêtes */}
            <Section
              id="quetes"
              icon={ListChecks}
              title={t('sectionLabels.quetes')}
            >
              <p>
                <Trans
                  t={t}
                  i18nKey="sections.quetes.intro"
                  components={{
                    strong: <strong className="text-foreground" />,
                  }}
                />
              </p>
              <ul className="space-y-1.5">
                <li>
                  •{' '}
                  <Trans
                    t={t}
                    i18nKey="sections.quetes.typesBullet"
                    components={{
                      strong1: <strong className="text-foreground" />,
                      strong2: <strong className="text-foreground" />,
                    }}
                  />
                </li>
                <li>
                  •{' '}
                  <Trans
                    t={t}
                    i18nKey="sections.quetes.claimBullet"
                    components={{
                      strong: <strong className="text-foreground" />,
                    }}
                  />
                </li>
                <li>
                  •{' '}
                  <Trans
                    t={t}
                    i18nKey="sections.quetes.perfectWeekBullet"
                    components={{
                      strong: <strong className="text-foreground" />,
                    }}
                  />
                </li>
              </ul>
            </Section>

            {/* Succès */}
            <Section id="succes" icon={Award} title={t('sectionLabels.succes')}>
              <p>
                <Trans
                  t={t}
                  i18nKey="sections.succes.intro"
                  components={{
                    strong: <strong className="text-foreground" />,
                  }}
                />
              </p>
              <ul className="space-y-1.5">
                <li>• {t('sections.succes.progressBullet')}</li>
                <li>
                  •{' '}
                  <Trans
                    t={t}
                    i18nKey="sections.succes.filterBullet"
                    components={{
                      allPill: <Pill />,
                      unlockedPill: <Pill />,
                      lockedPill: <Pill />,
                    }}
                  />
                </li>
                <li>• {t('sections.succes.rewardsBullet')}</li>
              </ul>
            </Section>

            {/* Chaîne de connexion */}
            <Section id="chaine" icon={Flame} title={t('sectionLabels.chaine')}>
              <p>
                <Trans
                  t={t}
                  i18nKey="sections.chaine.intro"
                  components={{
                    strong: <strong className="text-foreground" />,
                    strong2: <strong className="text-foreground" />,
                  }}
                />
              </p>
              <ul className="space-y-1.5">
                <li>
                  •{' '}
                  <Trans
                    t={t}
                    i18nKey="sections.chaine.milestonesBullet"
                    components={{
                      strong: <strong className="text-foreground" />,
                    }}
                  />
                </li>
                <li>• {t('sections.chaine.consistencyBullet')}</li>
              </ul>
            </Section>

            {/* Récompenses */}
            <Section
              id="recompenses"
              icon={Gift}
              title={t('sectionLabels.recompenses')}
            >
              <p>
                <Trans
                  t={t}
                  i18nKey="sections.recompenses.intro"
                  components={{
                    strong: <strong className="text-foreground" />,
                    strong2: <strong className="text-foreground" />,
                  }}
                />
              </p>
              <ul className="space-y-1.5">
                <li>• {t('sections.recompenses.claimBullet')}</li>
                <li>
                  •{' '}
                  <Trans
                    t={t}
                    i18nKey="sections.recompenses.cardBullet"
                    components={{
                      strong: <strong className="text-foreground" />,
                    }}
                  />
                </li>
              </ul>
              <InfoBox>{t('sections.recompenses.info')}</InfoBox>
            </Section>

            {/* Classements */}
            <Section
              id="classements"
              icon={Crown}
              title={t('sectionLabels.classements')}
            >
              <p>
                <Trans
                  t={t}
                  i18nKey="sections.classements.intro"
                  components={{
                    strong: <strong className="text-foreground" />,
                  }}
                />
              </p>
              <div className="space-y-2 mt-1">
                <div className="flex items-start gap-2">
                  <Pill>{t('sections.classements.collectors.title')}</Pill>
                  <span>
                    {t('sections.classements.collectors.description')}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Pill>{t('sections.classements.teams.title')}</Pill>
                  <span>{t('sections.classements.teams.description')}</span>
                </div>
                <div className="flex items-start gap-2">
                  <Pill>{t('sections.classements.combat.title')}</Pill>
                  <span>{t('sections.classements.combat.description')}</span>
                </div>
              </div>
            </Section>

            {/* Collection */}
            <Section
              id="collection"
              icon={Layers}
              title={t('sectionLabels.collection')}
            >
              <p>
                <Trans
                  t={t}
                  i18nKey="sections.collection.intro"
                  components={{
                    strong: <strong className="text-foreground" />,
                  }}
                />
              </p>
              <ul className="space-y-1.5">
                <li>
                  •{' '}
                  <Trans
                    t={t}
                    i18nKey="sections.collection.filterBullet"
                    components={{
                      strong: <strong className="text-foreground" />,
                    }}
                  />
                </li>
                <li>• {t('sections.collection.variantsLookBullet')}</li>
                <li>
                  •{' '}
                  <Trans
                    t={t}
                    i18nKey="sections.collection.cardSheetBullet"
                    components={{
                      strong1: <strong className="text-foreground" />,
                      strong2: <strong className="text-foreground" />,
                    }}
                  />
                </li>
                <li>
                  •{' '}
                  <Trans
                    t={t}
                    i18nKey="sections.collection.publicProfileBullet"
                    components={{
                      profilePill: <Pill>/profile/&lt;username&gt;</Pill>,
                    }}
                  />
                </li>
              </ul>
            </Section>

            {/* Équipes */}
            <Section
              id="equipes"
              icon={Users}
              title={t('sectionLabels.equipes')}
            >
              <p>
                <Trans
                  t={t}
                  i18nKey="sections.equipes.intro"
                  components={{
                    strong: <strong className="text-foreground" />,
                    teamLink: (
                      <Link
                        to="/team"
                        className="text-primary underline underline-offset-2"
                      />
                    ),
                  }}
                />
              </p>
              <ul className="space-y-1.5">
                <li>
                  •{' '}
                  <Trans
                    t={t}
                    i18nKey="sections.equipes.ownerBullet"
                    components={{
                      strong: <strong className="text-foreground" />,
                    }}
                  />
                </li>
                <li>• {t('sections.equipes.inviteBullet')}</li>
                <li>• {t('sections.equipes.invitationBullet')}</li>
                <li>
                  •{' '}
                  <Trans
                    t={t}
                    i18nKey="sections.equipes.leaderboardBullet"
                    components={{
                      strong: <strong className="text-foreground" />,
                    }}
                  />
                </li>
              </ul>
            </Section>

            {/* API & Discord */}
            <Section id="api" icon={BookOpen} title={t('sections.api.title')}>
              <p>
                <Trans
                  t={t}
                  i18nKey="sections.api.intro"
                  components={{
                    strong: <strong className="text-foreground" />,
                  }}
                />
              </p>
              <ul className="space-y-1.5">
                <li>
                  •{' '}
                  <Trans
                    t={t}
                    i18nKey="sections.api.authBullet"
                    components={{ apiKeyPill: <Pill>X-API-Key</Pill> }}
                  />
                </li>
                <li>
                  •{' '}
                  <Trans
                    t={t}
                    i18nKey="sections.api.endpointsBullet"
                    components={{
                      pullsPill: <Pill>POST /pulls</Pill>,
                      collectionPill: <Pill>GET /collection</Pill>,
                      leaderboardPill: <Pill>GET /leaderboard</Pill>,
                    }}
                  />
                </li>
              </ul>
              <div className="flex flex-wrap gap-3 mt-2">
                <Link
                  to="/api-docs"
                  className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
                >
                  {t('discord:header.apiReferenceLink')}
                </Link>
                <Link
                  to="/discord"
                  className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                >
                  {t('sections.api.discordGuideLink')}
                </Link>
              </div>
            </Section>
          </main>
        </div>

        {/* CTA */}
        <div className="mt-16 rounded-2xl border border-primary/20 bg-linear-to-br from-primary/5 to-secondary/5 p-8 flex items-center justify-between gap-6 flex-wrap">
          <div>
            <p className="text-base font-black text-foreground mb-1">
              {t('cta.title')}
            </p>
            <p className="text-xs text-text-light">{t('cta.subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={openRegister}
            className="shrink-0 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
          >
            {t('cta.button')}
          </button>
        </div>
      </div>
    </div>
  )
}
