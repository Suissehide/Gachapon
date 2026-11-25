import { ArrowRight, Coins, Sparkles, Star, Zap } from 'lucide-react'
import { Dialog } from 'radix-ui'
import { Children, isValidElement, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import type { CardDrop } from '../../api/campaign.api.ts'
import type { EquipmentDrop } from '../../api/equipment.api.ts'
import type { CardElement } from '../../constants/card.constant.ts'
import { currentLocale } from '../../i18n/index.ts'
import { cn, formatNumber } from '../../libs/utils.ts'
import {
  EquipmentDropReward,
  LootTile,
} from '../equipment/EquipmentDropCard.tsx'
import { TcgCardFace } from '../shared/tcg-card/TcgCardFace.tsx'
import { Button } from '../ui/button.tsx'
import { Popup, PopupContent } from '../ui/popup.tsx'

// Shared visual language for the battle-result popups (victory / defeat) and the
// campaign farm-result popup, so they stay uniform. The animations referenced
// here (`battleResultIn`, `battleBadgePop`) are global keyframes.

// Outer shell: rounded cream panel that slides in, with an optional amber halo
// burst behind the badge. Children are stacked and centered.
//
// C'est ici que vit la hauteur max : `PopupContent` est seulement centré en
// `fixed`, sans plafond ni défilement, donc un panneau plus haut que la
// fenêtre (une victoire avec carte + équipement + barre d'XP, par exemple)
// débordait hors écran, boutons compris, sans moyen d'y accéder.
export function ResultPanel({
  halo = false,
  children,
}: {
  halo?: boolean
  children: ReactNode
}) {
  return (
    <div className="relative max-h-[calc(100dvh-2rem)] overflow-y-auto overflow-x-hidden overscroll-contain rounded-[26px] px-6 py-8 sm:px-8 animate-[battleResultIn_0.4s_ease]">
      {halo && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-48"
          style={{
            background:
              'radial-gradient(50% 60% at 50% 50%, rgba(245,158,11,0.3), transparent 70%)',
          }}
          aria-hidden
        />
      )}
      <div className="relative flex flex-col items-center text-center">
        {children}
      </div>
    </div>
  )
}

// Circular gradient badge with a pop animation. `className` carries the gradient
// + shadow (amber for a win, slate for a loss).
export function ResultBadge({
  icon,
  className,
}: {
  icon: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex h-16 w-16 items-center justify-center rounded-full text-white animate-[battleBadgePop_0.5s_cubic-bezier(0.2,1.6,0.4,1)]',
        className,
      )}
    >
      {icon}
    </div>
  )
}

export const RESULT_BADGE_WIN =
  'bg-gradient-to-br from-amber-400 to-orange-500 shadow-[0_12px_28px_-8px_rgba(245,158,11,0.7)]'
export const RESULT_BADGE_LOSS =
  'bg-gradient-to-br from-slate-400 to-slate-600 shadow-md'
// Draw / timeout — indigo, distinct from both the amber win and the slate loss.
export const RESULT_BADGE_TIMEOUT =
  'bg-gradient-to-br from-indigo-400 to-indigo-600 shadow-md'

export function RewardTile({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode
  label: string
  value: number
  tone: string
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-white p-3">
      <span
        className="flex h-9 w-9 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${tone}1f`, color: tone }}
      >
        {icon}
      </span>
      <b className="font-display text-lg tabular-nums text-text">
        +{formatNumber(value, currentLocale())}
      </b>
      <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-text-light/70">
        {label}
      </span>
    </div>
  )
}

/**
 * Carte obtenue, dessinée plutôt que décrite : c'est le seul moment où on la
 * découvre, la réduire à une ligne de texte gâchait la récompense. Partagé par
 * l'écran de victoire et le résultat de balayage, qui affichaient jusqu'ici
 * deux rendus différents pour le même gain.
 *
 * Rien autour de l'illustration : ni libellé au-dessus, ni cadre derrière. La
 * carte porte déjà son nom, son extension et sa bordure de rareté ; l'encart
 * blanc n'ajoutait qu'un second cadre autour du premier. C'est la rangée
 * (`DropRail`) qui donne aux récompenses leur gabarit commun, pas une boîte.
 *
 * Seule marque posée dessus : la pastille « Nouveau » d'une carte encore
 * inconnue — même pastille, mêmes couleurs et même coin qu'au tirage
 * (`getSpecialBadges` dans machine/reveal/RevealGrid.tsx), pour que « je viens
 * de la débloquer » se lise pareil quel que soit l'écran qui l'annonce.
 */
export function CardDropReward({
  drop,
  className,
}: {
  drop: CardDrop
  className?: string
}) {
  const { t } = useTranslation('machine')
  return (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <div className="relative aspect-[2/3] w-full max-w-[190px]">
        {!drop.wasDuplicate && (
          <span className="pointer-events-none absolute top-2 right-2 z-20 flex items-center gap-1 rounded-full bg-emerald-500/95 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-600/40">
            <Star className="h-3 w-3" strokeWidth={2.5} />
            {t('machine:badges.newMasculine')}
          </span>
        )}
        <TcgCardFace
          rarity={drop.rarity}
          name={drop.name}
          setName={drop.setName}
          imageUrl={drop.imageUrl}
          variant="NORMAL"
          isOwned
          element={(drop.element ?? null) as CardElement | null}
        />
      </div>
    </div>
  )
}

// L'XP en bleu : le violet est la couleur de l'énergie, et les deux
// s'affichent côte à côte dans les récompenses de combat.
export const XP_TONE = '#3b82f6'

/** Poussière gagnée, au même gabarit qu'une pièce d'équipement. */
export function DustLootTile({ amount }: { amount: number }) {
  const { t } = useTranslation('combat')
  return (
    <LootTile
      icon={<Sparkles className="h-5 w-5" />}
      iconClassName="bg-sky-400/15 text-sky-500"
      title={`+${formatNumber(amount, currentLocale())}`}
      subtitle={t('combat:battle.rewards.dust')}
    />
  )
}

/** Énergie gagnée, quand c'est elle le lot de la victoire. */
export function EnergyLootTile({ amount }: { amount: number }) {
  const { t } = useTranslation('combat')
  return (
    <LootTile
      icon={<Zap className="h-5 w-5" />}
      iconClassName="bg-violet-500/15 text-violet-500"
      title={`+${formatNumber(amount, currentLocale())}`}
      subtitle={t('combat:battle.rewards.energy')}
    />
  )
}

/**
 * Grille des gains compacts d'un écran de résultat : poussière, énergie, puis
 * une tuile par pièce. Elle passe à la ligne au lieu de défiler, pour qu'un
 * balayage se lise d'un coup d'œil.
 */
export function LootGrid({ children }: { children: ReactNode }) {
  if (Children.toArray(children).length === 0) {
    return null
  }
  return (
    <div className="mt-4 flex w-full flex-wrap justify-center gap-2">
      {children}
    </div>
  )
}

// Largeur d'un encart de la rangée : assez étroite pour qu'un second encart
// dépasse du bord du panneau et annonce le défilement.
const DROP_TILE = 'w-[264px] shrink-0 snap-start [&>*]:w-full'

/**
 * Rangée des cartes obtenues sur un écran de résultat.
 *
 * À partir de deux, elles deviennent des encarts de largeur fixe qui défilent
 * horizontalement plutôt que de repousser les boutons du panneau. Une carte
 * seule prend le même encart, centré, pour garder le même gabarit d'un combat
 * à l'autre.
 *
 * Les enfants conditionnels (`{drop && <Fiche />}`) sont attendus : `false` ne
 * compte pas comme une récompense. En revanche un composant qui rend `null`
 * de lui-même compte pour un — d'où les gardes chez les appelants.
 */
export function DropRail({ children }: { children: ReactNode }) {
  const items = Children.toArray(children)
  if (items.length === 0) {
    return null
  }
  if (items.length === 1) {
    return (
      <div className="mt-4 flex w-full justify-center">
        <div className={cn('flex max-w-full', DROP_TILE)}>{items[0]}</div>
      </div>
    )
  }
  // La rangée déborde jusqu'aux bords du panneau (marges négatives + rembourrage
  // interne) : le troisième encart est ainsi coupé par le bord au lieu de
  // s'arrêter pile dedans, et le défilement se voit sans avoir à le deviner.
  // Le rembourrage de fin est plus large que celui de début pour que le dernier
  // encart ne vienne pas coller au bord du panneau en fin de défilement.
  //
  // `scroll-pl-*` doit reprendre le rembourrage de début de la piste : sans
  // lui, le premier point d'accrochage tombe à 24 px du début du contenu,
  // `scrollLeft: 0` n'est plus une position valide, et l'accrochage obligatoire
  // décalait la rangée vers la droite de lui-même à l'ouverture de la fenêtre.
  return (
    <div className="-mx-6 mt-4 w-[calc(100%+3rem)] snap-x snap-mandatory scroll-pl-6 overflow-x-auto overscroll-x-contain pb-2 sm:-mx-8 sm:w-[calc(100%+4rem)] sm:scroll-pl-8 [scrollbar-width:thin]">
      {/* Le rembourrage vit sur la piste, pas sur le conteneur de défilement :
          un `padding-right` posé sur ce dernier n'est pas toujours compté dans
          la zone défilable, et le dernier encart collerait au bord. */}
      <div className="flex w-max items-stretch gap-3 pl-6 pr-10 sm:pl-8 sm:pr-12">
        {items.map((item, index) => (
          <div
            key={isValidElement(item) && item.key !== null ? item.key : index}
            className={cn('flex', DROP_TILE)}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Fenêtre de fin de combat multiple, partagée par la campagne et les tours.
 *
 * Les deux annoncent la même chose — le nombre de passages, les trois totaux,
 * puis les gains en rangées — et ne divergent que sur ce qui peut tomber : la
 * tour ne droppe pas de carte, elle passe donc `cardDrops` vide (ou pas du
 * tout) et la rangée correspondante disparaît d'elle-même.
 */
export function FarmResultPopup({
  runs,
  totalGold,
  totalXp,
  dustDrops,
  energyDrops,
  equipmentDrops,
  cardDrops = [],
  onClose,
}: {
  runs: number
  totalGold: number
  totalXp: number
  dustDrops: number[]
  energyDrops: number[]
  equipmentDrops: EquipmentDrop[]
  cardDrops?: CardDrop[]
  onClose: () => void
}) {
  const { t } = useTranslation('combat')
  // Une même carte peut tomber plusieurs fois dans un balayage : la clé est
  // l'id de la carte suivi de son rang d'apparition (1re, 2e, …).
  const seen = new Map<string, number>()
  const keyedCardDrops = cardDrops.map((drop) => {
    const occurrence = (seen.get(drop.cardId) ?? 0) + 1
    seen.set(drop.cardId, occurrence)
    return { drop, key: `${drop.cardId}-${occurrence}` }
  })
  // Un lot de poussière ou d'énergie par combat : autant de tuiles que de
  // lots, pour qu'un balayage de dix combats montre dix gains.
  const flatLots = [
    ...dustDrops.map((amount) => ({ kind: 'dust' as const, amount })),
    ...energyDrops.map((amount) => ({ kind: 'energy' as const, amount })),
  ].map((lot, rank) => ({ ...lot, key: `${lot.kind}-${rank}` }))
  return (
    <Popup
      open
      onOpenChange={(v) => {
        if (!v) {
          onClose()
        }
      }}
    >
      <PopupContent
        size="lg"
        className="border-0 bg-[#fbf8f3] p-0 shadow-[0_30px_80px_-12px_rgba(0,0,0,0.4)]"
      >
        <Dialog.Title className="sr-only">
          {t('combat:farmResult.title')}
        </Dialog.Title>
        <ResultPanel halo>
          <ResultBadge
            className={RESULT_BADGE_WIN}
            icon={<Zap className="h-8 w-8" />}
          />
          <h2 className="mt-4 font-display text-3xl font-bold text-text">
            {t('combat:farmResult.title')}
          </h2>
          <p className="mt-1 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-text-light/70">
            {t('combat:farmResult.runs', { count: runs })}
          </p>

          <div className="mt-6 grid w-full grid-cols-2 gap-2.5">
            <RewardTile
              icon={<Coins className="h-5 w-5" />}
              label={t('combat:battle.rewards.gold')}
              value={totalGold}
              tone="#f59e0b"
            />
            <RewardTile
              icon={<Star className="h-5 w-5" />}
              label="XP"
              value={totalXp}
              tone={XP_TONE}
            />
          </div>

          {/* Mêmes tuiles que l'écran de victoire : poussière et pièces en
              grille compacte, une tuile par lot, la fiche d'une pièce s'ouvre au clic. Les
              cartes gardent leur rangée, elles se regardent. */}
          <LootGrid>
            {flatLots.map(({ kind, amount, key }) =>
              kind === 'dust' ? (
                <DustLootTile key={key} amount={amount} />
              ) : (
                <EnergyLootTile key={key} amount={amount} />
              ),
            )}
            {equipmentDrops.map((e) => (
              <EquipmentDropReward key={e.userEquipmentId} drop={e} />
            ))}
          </LootGrid>
          <DropRail>
            {keyedCardDrops.map(({ drop, key }) => (
              <CardDropReward key={key} drop={drop} />
            ))}
          </DropRail>

          <div className="mt-6 flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-center">
            <Button onClick={onClose} className="gap-2">
              {t('combat:farmResult.continue')}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </ResultPanel>
      </PopupContent>
    </Popup>
  )
}
