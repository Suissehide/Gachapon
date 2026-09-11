// RaidPanel — panneau de raid, premier bloc de la colonne droite de la fiche
// d'équipe. Reprend `docs/design_handoff_equipe/equipe.css` (`.tmB-top`,
// `.tmB-h1`, `.tm-chip--amber`, `.tm-btn--amber`, `.tm-hp*`, `.tm-tier*`) et
// la composition de `HpBar` dans `equipe-parts.jsx`.
//
// La barre de PV n'est PAS redessinée ici : c'est `GradedHpBar`, la primitive
// partagée créée pour cet écran. Elle se remplit avec les dégâts infligés et
// imprime les PV RESTANTS du boss — cette inversion est voulue, vérifiée
// contre la capture du handoff, et corrigeait un vrai bug (la barre se
// remplissait autrefois à l'envers des repères de palier). Ne pas la
// « rétablir ».
//
// Les contributions ne sont plus listées ici : elles ont leur propre section
// sous ce panneau (`ContributionsTable`), comme dans la maquette.
import { Link } from '@tanstack/react-router'
import dayjs from 'dayjs'
import {
  CalendarDays,
  Check,
  Coins,
  Sparkles,
  Swords,
  Ticket,
} from 'lucide-react'
import { useEffect, useState } from 'react'

import type { RaidTierView, RaidView } from '../../api/raid.api.ts'
import { RARITY_LABEL_FR } from '../../libs/rarity.ts'
import { cn } from '../../libs/utils.ts'
import { useRaid, useRaidLive } from '../../queries/useRaid.ts'
import { ArcadeCard } from '../shared/ArcadeCard.tsx'
import { CardDisplay } from '../shared/tcg-card/CardDisplay.tsx'
import { Button } from '../ui/button.tsx'
import { PanelTitle, SectionLabel } from '../ui/sectionHeading.tsx'
import { GradedHpBar } from './GradedHpBar.tsx'

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

// Carte de palier, trois états (`.tm-tier`, `.tm-tier--done`,
// `.tm-tier--next`). `reached` vient du serveur ; « en cours » est le premier
// palier non atteint, donc une position dans la liste, pas un champ.
function TierCard({
  tier,
  state,
}: {
  tier: RaidTierView
  state: 'done' | 'next' | 'todo'
}) {
  const done = state === 'done'
  const iconClass = cn(
    'h-3.5 w-3.5',
    done ? 'text-primary' : 'text-foreground/40',
  )

  return (
    <div
      className={cn(
        'rounded-[15px] border-[1.5px] p-[12px_13px]',
        done &&
          'border-primary/40 bg-primary/10 shadow-[0_2px_0_rgba(245,158,11,0.1)]',
        state === 'next' && 'border-foreground/16 bg-card',
        state === 'todo' && 'border-foreground/7 bg-muted',
      )}
    >
      <div
        className={cn(
          'flex items-center gap-1.5 font-mono text-[11px] font-bold tracking-[0.1em]',
          done ? 'text-primary-darker' : 'text-foreground/50',
        )}
      >
        {done && (
          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="h-2.5 w-2.5" strokeWidth={3} />
          </span>
        )}
        {tier.pct} %{state === 'next' && ' · EN COURS'}
      </div>

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-xs font-semibold text-foreground/75">
        <span className="inline-flex items-center gap-1.5">
          <Ticket className={iconClass} />
          {tier.reward.tokens}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Coins className={iconClass} />
          {tier.reward.gold}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className={iconClass} />
          {tier.reward.dust}
        </span>
      </div>

      {tier.reward.cardRarity && (
        <div className="mt-2 inline-flex rounded-full border border-secondary/40 bg-secondary/10 px-2 py-[3px] font-mono text-[10px] tracking-[0.08em] text-secondary-dark">
          Carte{' '}
          {RARITY_LABEL_FR[tier.reward.cardRarity] ?? tier.reward.cardRarity}
        </div>
      )}
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
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 font-mono text-[10px] font-bold tracking-[0.1em] text-foreground/60">
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
  // Un bouton grisé muet ne dit rien : le libellé porte lui-même la raison.
  const attackLabel = killed
    ? 'Boss vaincu'
    : noAttackLeft
      ? "Plus d'attaque aujourd'hui"
      : `Attaquer (${raid.me.attacksRemainingToday}/${raid.me.attacksPerDay})`
  // « En cours » = le premier palier non atteint. `reached` est servi par le
  // serveur, la position ne l'est pas.
  const nextTierIndex = raid.tiers.findIndex((t) => !t.reached)

  return (
    <ArcadeCard>
      {/* `.tmB-top` : label + titre à gauche, minuteur et attaque à droite,
          alignés sur la ligne de base du titre. */}
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0">
          <SectionLabel>Raid d'équipe</SectionLabel>
          <PanelTitle size="lg" className="mt-1.5">
            {raid.boss.name}
          </PanelTitle>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* `.tm-chip--amber` — encre ambrée foncée sur fond ambré très
              clair, rendue en opacités du token plutôt qu'en hex, comme le
              reste de l'écran. */}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 font-mono text-[10px] font-bold tracking-[0.1em] text-primary-darker">
            <CalendarDays className="h-3.5 w-3.5" />
            {ended ? 'Terminé' : formatRemaining(raid.endsAt)}
          </span>

          {/* `.tm-btn--amber` : radius 12, padding 11/18, 700 à 14 px, halo
              ambré. La variante `default` du bouton porte déjà le fond. */}
          {killed || noAttackLeft ? (
            <Button variant="amber" size="action" disabled>
              <Swords className="h-4 w-4" />
              {attackLabel}
            </Button>
          ) : (
            <Button variant="amber" size="action" asChild>
              <Link to="/team/$id/raid" params={{ id: teamId }}>
                <Swords className="h-4 w-4" />
                {attackLabel}
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Visuel du boss à largeur fixe (176 px, `.tm-boss`), barre et paliers
          dans le reste. `minmax(0,1fr)` pour que la rangée de paliers puisse
          rétrécir au lieu d'imposer sa largeur intrinsèque. */}
      <div className="mt-5 grid grid-cols-1 items-start gap-6 sm:grid-cols-[176px_minmax(0,1fr)]">
        <div className="flex w-full max-w-[176px] flex-col items-center gap-2">
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

        <div className="min-w-0">
          <GradedHpBar
            done={raid.damageDone}
            max={raid.maxHp}
            tiers={raid.tiers.map((t) => t.pct)}
          />

          {/* `.tm-tiers` : quatre colonnes, gap 10 px, 12 px sous la barre.
              Deux colonnes tant que la place manque — la colonne droite
              descend à ~628 px entre 1024 et 1280 px de fenêtre. */}
          <div className="mt-3 grid grid-cols-2 gap-2.5 xl:grid-cols-4">
            {raid.tiers.map((tier, i) => (
              <TierCard
                key={tier.pct}
                tier={tier}
                state={
                  tier.reached ? 'done' : i === nextTierIndex ? 'next' : 'todo'
                }
              />
            ))}
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
