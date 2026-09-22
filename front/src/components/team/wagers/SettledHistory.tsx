// Historique réglé — la carte pleine largeur sous les deux sœurs. Reprend
// `docs/design_handoff_duels/reference/equipe-duels.css` (`.dz-hist`,
// `.dz-hist-row`, `.dz-gain`).
//
// Deux écarts assumés par rapport à la maquette, tous deux pour ne pas
// afficher une donnée que le serveur ne tient pas :
//
//  - pas de « 7 DERNIERS JOURS » en tête de droite : `listRecentSettled*`
//    renvoie les N plus récents, sans aucune borne de date — la fenêtre de
//    la maquette serait une invention, et son compte exact n'apprend rien ;
//  - un duel gagné affiche « +N cartes » et non une poussière : l'enjeu d'un
//    duel est la main du perdant, pas une mise. Le nombre vient de
//    `transferredCount`, le compte RÉEL des lignes `DuelTransfer` — un
//    transfert peut échouer, donc il ne se déduit pas du nombre de tirages.
import dayjs from 'dayjs'
import type { TFunction } from 'i18next'
import { Eye, Layers, Sparkles, Swords, Target, Trophy } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { BetView, DuelView } from '../../../api/wagers.api.ts'
import { currentLocale, type Locale } from '../../../i18n/index.ts'
import { RARITY_LABEL_FR } from '../../../libs/rarity.ts'
import { cn, formatNumber } from '../../../libs/utils.ts'
import { Button } from '../../ui/button.tsx'
import { SectionLabel } from '../../ui/sectionHeading.tsx'
import { DuelCardsPopup } from './DuelCardsPopup.tsx'
import { WagerCard, WagerEmpty } from './parts.tsx'

/** Entrées gardées à l'écran, duels et paris confondus. */
const HISTORY_SIZE = 20

const fr = (n: number) => formatNumber(n, currentLocale())

function shortDate(iso: string | null): string {
  return iso === null ? '' : dayjs(iso).format('D MMM').toUpperCase()
}

/**
 * Suffixe ordinal du rang de tirage concluant (« 1er »/« 5e » en français,
 * « 1st »/« 5th » en anglais) : contrairement à `plural()`, cette grammaire
 * n'a pas d'équivalent i18next intégré (ce n'est pas un pluriel), donc on la
 * calcule ici plutôt que de coder en dur la seule règle française.
 */
function ordinal(n: number, locale: Locale): string {
  if (locale === 'fr') {
    return `${n}${n === 1 ? 'er' : 'e'}`
  }
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) {
    return `${n}th`
  }
  switch (n % 10) {
    case 1:
      return `${n}st`
    case 2:
      return `${n}nd`
    case 3:
      return `${n}rd`
    default:
      return `${n}th`
  }
}

/**
 * Un butin gagné, avec SON unité. Les deux mécaniques ne paient pas dans la
 * même monnaie — un duel rafle des cartes, un pari rend de la poussière — et
 * les afficher toutes deux en vert générique les aurait confondues. Chacune
 * porte donc son icône et sa couleur : `Sparkles` ambré pour la poussière,
 * comme partout ailleurs dans le jeu, `Layers` en encre neutre pour les
 * cartes.
 */
type Gain = { value: string; unit: 'dust' | 'cards' }

type Row = {
  key: string
  kind: 'duel' | 'bet'
  settledAt: string | null
  title: string
  detail: string
  /** `null` quand rien n'a été gagné : la colonne affiche alors un tiret. */
  gain: Gain | null
  /**
   * Identifiant du duel quand des cartes ont changé de main : c'est lui qui
   * fait apparaître le bouton de détail. `null` sur un pari, sur une égalité
   * et sur un duel où rien n'a pu être transféré — un œil qui ouvrirait une
   * liste vide est une commande morte.
   */
  transfersDuelId: string | null
}

function duelRow(duel: DuelView, t: TFunction<'wagers'>): Row {
  const locale = currentLocale()
  const score = `${formatNumber(duel.challengerScore, locale)} – ${formatNumber(duel.opponentScore, locale)}`
  const title = `${duel.challenger.username} ${score} ${duel.opponent.username}`
  const iWon =
    duel.myRole !== 'SPECTATOR' &&
    duel.winnerId ===
      (duel.myRole === 'CHALLENGER' ? duel.challenger.id : duel.opponent.id)

  const verdict =
    duel.winnerId === null
      ? t('settledHistory.tie')
      : duel.myRole === 'SPECTATOR'
        ? t('settledHistory.winnerTakesAll', {
            name: (duel.winnerId === duel.challenger.id
              ? duel.challenger.username
              : duel.opponent.username
            ).toUpperCase(),
          })
        : iWon
          ? t('settledHistory.duelWon')
          : t('settledHistory.duelLost')

  return {
    key: `duel-${duel.id}`,
    kind: 'duel',
    settledAt: duel.settledAt,
    title,
    detail: [verdict, shortDate(duel.settledAt)].filter(Boolean).join(' · '),
    transfersDuelId: duel.transferredCount > 0 ? duel.id : null,
    gain:
      iWon && duel.transferredCount > 0
        ? {
            value: t('wonCardsLabel', { count: duel.transferredCount }),
            unit: 'cards',
          }
        : null,
  }
}

/**
 * `payout` porte trois sens selon `status` : le gain total si WON, la mise
 * remboursée si EXPIRED, rien si LOST. Un remboursement n'est PAS un gain —
 * il reste donc hors de la colonne verte et se dit dans le détail, sans quoi
 * un pari expiré se lirait comme un pari gagné.
 */
function betRow(bet: BetView, t: TFunction<'wagers'>): Row {
  const locale = currentLocale()
  const rarityLabel = RARITY_LABEL_FR[bet.minRarity] ?? bet.minRarity
  // Le rang du tirage concluant n'existe que si la rareté a été atteinte, ce
  // qui fait gagner le camp « oui » et perdre le camp « non ». Le détail suit
  // donc l'ÉVÈNEMENT, jamais mon verdict personnel — sur le même marché, deux
  // joueurs lisent la même phrase et deux gains différents.
  const rarityWasReached = bet.status === 'WON'
  const detail =
    bet.status === 'EXPIRED'
      ? t('settledHistory.betExpired', {
          target: bet.target.username.toUpperCase(),
        })
      : rarityWasReached
        ? t('settledHistory.betReachedAt', {
            ordinal: ordinal(bet.pullsSeen, locale),
          })
        : t('settledHistory.betNoSuccess', {
            seen: bet.pullsSeen,
            window: bet.pullWindow,
          })

  // `myPayout` est nul pour un spectateur comme pour un perdant : seul celui
  // qui a misé ET gagné voit un montant.
  const won = bet.myPayout > 0 && bet.status !== 'EXPIRED'

  return {
    key: `bet-${bet.id}`,
    kind: 'bet',
    settledAt: bet.settledAt,
    title: t('settledHistory.betTitle', {
      target: bet.target.username,
      rarity: rarityLabel,
    }),
    detail: [detail, shortDate(bet.settledAt)].filter(Boolean).join(' · '),
    transfersDuelId: null,
    gain: won ? { value: `+${fr(bet.myPayout)}`, unit: 'dust' } : null,
  }
}

function HistoryRow({
  row,
  onOpenCards,
}: {
  row: Row
  onOpenCards: (duelId: string) => void
}) {
  const { t } = useTranslation('wagers')
  const Icon = row.kind === 'duel' ? Swords : Target
  return (
    <li className="grid grid-cols-[30px_1fr_auto] items-center gap-3 rounded-[14px] border border-foreground/7 bg-card px-3.5 py-[11px]">
      <span
        className={cn(
          'flex h-[30px] w-[30px] items-center justify-center rounded-[10px] text-white',
          row.kind === 'duel' ? 'bg-primary' : 'bg-wager-bet',
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13.5px] font-bold text-text">
          {row.title}
        </span>
        <span className="block truncate font-mono text-[10px] tracking-[0.1em] text-foreground/45">
          {row.detail}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {row.transfersDuelId !== null && (
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => onOpenCards(row.transfersDuelId as string)}
            title={t('settledHistory.viewCardsTitle')}
            aria-label={t('settledHistory.viewCardsTitle')}
            className="border-foreground/10 text-foreground/45 hover:border-primary/40 hover:bg-primary/10 hover:text-primary-dark"
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
        )}
        {row.gain === null ? (
          <span className="shrink-0 font-display text-[15px] font-extrabold tabular-nums text-foreground/40">
            —
          </span>
        ) : (
          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-1 font-display text-[15px] font-extrabold tabular-nums',
              // Le bleu et l'étincelle de la poussière viennent de /guide, qui
              // fixe la teinte de chaque monnaie ; les cartes d'un duel
              // prennent une encre neutre, elles ne sont pas une monnaie.
              row.gain.unit === 'dust' ? 'text-dust' : 'text-text',
            )}
          >
            {row.gain.unit === 'dust' ? (
              <Sparkles className="h-3.5 w-3.5" />
            ) : (
              <Layers className="h-3.5 w-3.5" />
            )}
            {row.gain.value}
          </span>
        )}
      </span>
    </li>
  )
}

export function SettledHistory({
  teamId,
  settledDuels,
  settledBets,
}: {
  teamId: string
  settledDuels: DuelView[]
  settledBets: BetView[]
}) {
  const { t } = useTranslation('wagers')
  const [openDuelId, setOpenDuelId] = useState<string | null>(null)
  const rows = [
    ...settledDuels.map((duel) => duelRow(duel, t)),
    ...settledBets.map((bet) => betRow(bet, t)),
  ]
    .sort((a, b) => (b.settledAt ?? '').localeCompare(a.settledAt ?? ''))
    .slice(0, HISTORY_SIZE)
  const openRow = rows.find((row) => row.transfersDuelId === openDuelId)

  return (
    <WagerCard>
      <SectionLabel as="h3">{t('settledHistory.title')}</SectionLabel>

      {rows.length === 0 ? (
        <div className="mt-4 flex">
          <WagerEmpty icon={Trophy}>{t('settledHistory.emptyBody')}</WagerEmpty>
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {rows.map((row) => (
            <HistoryRow key={row.key} row={row} onOpenCards={setOpenDuelId} />
          ))}
        </ul>
      )}

      <DuelCardsPopup
        teamId={teamId}
        duelId={openDuelId}
        title={openRow?.title ?? ''}
        onClose={() => setOpenDuelId(null)}
      />
    </WagerCard>
  )
}
