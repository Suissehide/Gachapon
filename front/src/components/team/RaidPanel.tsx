import { Link } from '@tanstack/react-router'
import dayjs from 'dayjs'
import { Clock, Coins, Sparkles, Swords, Ticket } from 'lucide-react'
import { useEffect, useState } from 'react'

import type {
  RaidContribution,
  RaidTierView,
  RaidView,
} from '../../api/raid.api.ts'
import { RARITY_LABEL_FR } from '../../libs/rarity.ts'
import { cn } from '../../libs/utils.ts'
import { useRaid, useRaidLive } from '../../queries/useRaid.ts'
import { ArcadeCard } from '../shared/ArcadeCard.tsx'
import { CardDisplay } from '../shared/tcg-card/CardDisplay.tsx'
import { Button } from '../ui/button.tsx'

function minutesRemaining(endsAt: string): number {
  return Math.max(0, dayjs(endsAt).diff(dayjs(), 'minute'))
}

function formatRemaining(endsAt: string): string {
  const diffMin = minutesRemaining(endsAt)
  const days = Math.floor(diffMin / 1440)
  const hours = Math.floor((diffMin % 1440) / 60)
  const minutes = diffMin % 60
  if (days > 0) {
    return hours > 0 ? `${days} j ${hours} h` : `${days} j`
  }
  if (hours > 0) {
    return minutes > 0 ? `${hours} h ${minutes} min` : `${hours} h`
  }
  return `${minutes} min`
}

function TierMarker({ tier }: { tier: RaidTierView }) {
  return (
    <div
      className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
      style={{ left: `${tier.pct}%` }}
      title={`${tier.pct} % · ${tier.reward.tokens} jetons · ${tier.reward.gold} or · ${tier.reward.dust} poussière${tier.reward.cardRarity ? ` · carte ${RARITY_LABEL_FR[tier.reward.cardRarity] ?? tier.reward.cardRarity}` : ''}`}
    >
      <span
        className={cn(
          'h-4 w-0.5',
          tier.reached ? 'bg-primary' : 'bg-text-light/30',
        )}
      />
      <span
        className={cn(
          'mt-0.5 font-mono text-[10px]',
          tier.reached ? 'text-primary-dark' : 'text-text-light/60',
        )}
      >
        {tier.pct}%
      </span>
    </div>
  )
}

// `dealtPct` (dégâts infligés) est la même valeur que celle affichée en
// légende ("X % infligés") — seule source de vérité, passée en prop plutôt
// que recalculée ici. La barre se remplit de gauche à droite vers 100 %,
// dans le même sens que les paliers (`left: ${tier.pct}%`) : avant ce
// correctif elle se remplissait avec les PV restants (sens inverse), donc
// une équipe à 25 % de dégâts voyait le bord de la barre sur le repère
// "75 %". Dégradé conservé mais inversé : `primary` (départ) → `destructive`
// au bord d'attaque, qui se rapproche visuellement du rouge à mesure que le
// boss se rapproche de la mort, plutôt que fixe à gauche comme avant.
function HpBar({ raid, dealtPct }: { raid: RaidView; dealtPct: number }) {
  return (
    <div className="relative pb-6">
      <div className="h-4 overflow-hidden rounded-full border border-border bg-background">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-destructive transition-[width] duration-700"
          style={{ width: `${dealtPct}%` }}
        />
      </div>
      <div className="absolute inset-x-0 top-4 h-8">
        {raid.tiers.map((t) => (
          <TierMarker key={t.pct} tier={t} />
        ))}
      </div>
    </div>
  )
}

// Boss rendered as a real game card rather than a bare portrait: no rarity,
// set or level exist for a boss, so `LEGENDARY` is picked purely for the
// frame it draws — the raid boss is the hardest fight in the game, so it
// gets the top-tier frame — never a literal rarity claim about the boss.
// `showSetName={false}` hides the family tag (there's no set to name) while
// keeping the name band; the element badge the card already renders (top
// left) is the only element signal — no separate colored frame/pill is
// layered on top of it. Defeat reuses `isOwned={false}`, which already
// grayscales the art and suppresses the description exactly like an
// unowned collection card, plus an explicit "Vaincu" overlay for the label.
function BossCard({
  boss,
  killed,
}: {
  boss: RaidView['boss']
  killed: boolean
}) {
  return (
    // `w-full` est obligatoire, pas cosmetique : la colonne parente est un
    // flex `items-center`, qui dimensionne ses enfants sur leur contenu. Or
    // ce contenu est une carte en largeur relative (`w-full aspect-[2/3]`) :
    // sans largeur definie ici la reference est circulaire et la carte
    // s'effondre a 0x0. Meme piege que le <button> de CollectionCard.tsx.
    <div className="relative w-full">
      <CardDisplay
        rarity="LEGENDARY"
        name={boss.name}
        setName=""
        showSetName={false}
        imageUrl={boss.imageUrl}
        element={boss.element}
        isOwned={!killed}
        // `compact` = la carte epouse la largeur de son parent (ratio 2/3) au
        // lieu d'une taille fixe 240x360, qui deborderait de la colonne.
        compact
        interactive={!killed}
        showAura={!killed}
      />
      {killed && (
        <div className="absolute inset-0 z-30 flex items-center justify-center rounded-[10px] bg-black/50 font-display text-lg font-bold text-white">
          Vaincu
        </div>
      )}
    </div>
  )
}

function BossPowerBadge({ power }: { power: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-2.5 py-1 font-mono text-xs text-text-light">
      <Swords className="h-3.5 w-3.5" />
      {power.toLocaleString('fr-FR')}
    </span>
  )
}

// Vue agrandie calquée sur CardViewModal (collection) : surcouche plein
// écran + carte `large`, PAS une Popup à en-tête — c'est la présentation
// que le joueur connaît déjà pour ses propres cartes.
function BossCardOverlay({
  boss,
  killed,
  onClose,
}: {
  boss: RaidView['boss']
  killed: boolean
  onClose: () => void
}) {
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: motif de fermeture au clic sur le fond, comme CardViewModal
    <div
      className="fixed inset-x-0 bottom-0 top-[var(--topbar-h)] z-[100] overflow-y-auto bg-black/55 backdrop-blur-md"
      role="presentation"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          onClose()
        }
      }}
    >
      <div className="flex min-h-full items-center justify-center px-4 py-10">
        <div className="flex flex-col items-center gap-4 animate-in fade-in-0 zoom-in-95 duration-300">
          {/* biome-ignore lint/a11y/noStaticElementInteractions: wrapper d'arrêt de propagation, pas une zone interactive */}
          <div
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <CardDisplay
              rarity="LEGENDARY"
              name={boss.name}
              setName=""
              showSetName={false}
              imageUrl={boss.imageUrl}
              element={boss.element}
              isOwned={!killed}
              interactive
              large
              showAura={!killed}
            />
          </div>
          <BossPowerBadge power={boss.power} />
        </div>
      </div>
    </div>
  )
}

function ContributionRow({ c, rank }: { c: RaidContribution; rank: number }) {
  return (
    <li className="flex items-center gap-3 py-1.5">
      <span className="w-5 font-mono text-xs text-text-light">{rank}</span>
      {c.user.avatar ? (
        <img
          src={c.user.avatar}
          alt=""
          className="h-7 w-7 rounded-full object-cover"
        />
      ) : (
        <span className="h-7 w-7 rounded-full bg-border" />
      )}
      <span className="flex-1 truncate text-sm text-text">
        {c.user.username}
      </span>
      <span className="font-mono text-xs text-text-light">
        {c.attacks} att.
      </span>
      <span className="font-mono text-sm font-bold text-text">
        {c.damage.toLocaleString('fr-FR')}
      </span>
    </li>
  )
}

export function RaidPanel({ teamId }: { teamId: string }) {
  const { data: raid, isLoading, isError } = useRaid(teamId)
  useRaidLive(teamId)
  // Declare avant toute sortie anticipee : les hooks doivent s'executer dans
  // le meme ordre a chaque rendu.
  const [inspecting, setInspecting] = useState(false)
  const [, tick] = useState(0)

  // Force un rafraîchissement du texte du compte à rebours une fois par
  // minute — sans ça il reste figé sur la valeur calculée au montage tant
  // qu'aucun coéquipier n'attaque. Inutile de tourner si le raid est déjà
  // terminé (boss vaincu ou semaine écoulée).
  useEffect(() => {
    if (!raid || raid.killedAt !== null || minutesRemaining(raid.endsAt) <= 0) {
      return
    }
    const id = setInterval(() => tick((n) => n + 1), 60_000)
    return () => clearInterval(id)
  }, [raid])

  if (isLoading) {
    return (
      <ArcadeCard>
        <p className="text-center text-text-light">Chargement du raid…</p>
      </ArcadeCard>
    )
  }
  if (isError || !raid) {
    return (
      <ArcadeCard>
        <p className="text-center text-destructive">
          Impossible de charger le raid de la semaine.
        </p>
      </ArcadeCard>
    )
  }

  const killed = raid.killedAt !== null
  const ended = killed || minutesRemaining(raid.endsAt) <= 0
  const noAttackLeft = raid.me.attacksRemainingToday === 0
  const attackLabel = killed
    ? 'Boss vaincu'
    : noAttackLeft
      ? "Plus d'attaque aujourd'hui"
      : `Attaquer (${raid.me.attacksRemainingToday}/${raid.me.attacksPerDay})`
  const dealtPct =
    raid.maxHp > 0 ? Math.round((raid.damageDone / raid.maxHp) * 100) : 0

  return (
    <ArcadeCard>
      <div className="flex flex-col gap-5 md:flex-row">
        <div className="flex w-36 shrink-0 flex-col items-center gap-2 md:w-40">
          <button
            type="button"
            onClick={() => setInspecting(true)}
            aria-label={`Voir la carte du boss ${raid.boss.name} en grand`}
            // `block w-full` obligatoire : un <button> se dimensionne sur son
            // contenu, or la carte est en largeur relative — sans largeur
            // imposée la référence est circulaire et tout s'effondre à 0x0.
            className="block w-full cursor-pointer rounded-xl transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <BossCard boss={raid.boss} killed={killed} />
          </button>
          <BossPowerBadge power={raid.boss.power} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-text-light/60">
                Raid d'équipe
              </div>
              <h2 className="font-display text-2xl font-bold text-text">
                {raid.boss.name}
              </h2>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-xs text-text-light">
              <Clock className="h-4 w-4" />
              {ended ? 'Terminé' : `${formatRemaining(raid.endsAt)} restants`}
            </div>
          </div>

          <HpBar raid={raid} dealtPct={dealtPct} />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="font-mono text-sm text-text">
              {raid.hp.toLocaleString('fr-FR')} /{' '}
              {raid.maxHp.toLocaleString('fr-FR')} PV
              <span className="ml-2 text-text-light">
                ({dealtPct} % infligés)
              </span>
            </span>
            {killed || noAttackLeft ? (
              <Button disabled className="gap-2" title={attackLabel}>
                <Swords className="h-4 w-4" />
                {attackLabel}
              </Button>
            ) : (
              <Button asChild className="gap-2">
                <Link to="/team/$id/raid" params={{ id: teamId }}>
                  <Swords className="h-4 w-4" />
                  {attackLabel}
                </Link>
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {raid.tiers.map((t) => (
              <div
                key={t.pct}
                className={cn(
                  'rounded-xl border p-2 text-xs',
                  t.reached
                    ? 'border-primary/40 bg-primary/10'
                    : 'border-border bg-background/60 text-text-light',
                )}
              >
                <div className="font-mono font-bold">{t.pct} %</div>
                <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                  <span className="inline-flex items-center gap-1">
                    <Ticket className="h-3 w-3" />
                    {t.reward.tokens}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Coins className="h-3 w-3" />
                    {t.reward.gold}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    {t.reward.dust}
                  </span>
                  {t.reward.cardRarity && (
                    <span className="w-full">
                      Carte{' '}
                      {RARITY_LABEL_FR[t.reward.cardRarity] ??
                        t.reward.cardRarity}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div>
            <div className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-text-light/60">
              Contributions
            </div>
            {raid.contributions.length === 0 ? (
              <p className="text-sm text-text-light">
                Personne n'a encore attaqué cette semaine. Lance-toi !
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {raid.contributions.map((c, i) => (
                  <ContributionRow key={c.user.id} c={c} rank={i + 1} />
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {inspecting && (
        <BossCardOverlay
          boss={raid.boss}
          killed={killed}
          onClose={() => setInspecting(false)}
        />
      )}
    </ArcadeCard>
  )
}
