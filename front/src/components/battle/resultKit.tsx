import { ArrowRight, Coins, Sparkles, Star, Zap } from 'lucide-react'
import { Dialog } from 'radix-ui'
import { Children, isValidElement, type ReactNode } from 'react'

import type { CardDrop } from '../../api/campaign.api.ts'
import type { EquipmentDrop } from '../../api/equipment.api.ts'
import type { CardElement } from '../../constants/card.constant.ts'
import { cn } from '../../libs/utils.ts'
import { EquipmentDropReward } from '../equipment/EquipmentDropCard.tsx'
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
        +{value.toLocaleString('fr-FR')}
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
  return (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <div className="relative aspect-[2/3] w-full max-w-[190px]">
        {!drop.wasDuplicate && (
          <span className="pointer-events-none absolute top-2 right-2 z-20 flex items-center gap-1 rounded-full bg-emerald-500/95 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-600/40">
            <Star className="h-3 w-3" strokeWidth={2.5} />
            Nouveau
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

// Largeur d'un encart de la rangée. Assez large pour que la fiche de pièce
// garde ses stats lisibles (elle passe ses sous-stats sur une colonne à cette
// largeur, cf. la requête de conteneur dans EquipmentDropCard), assez étroite
// pour qu'un second encart dépasse du bord du panneau et annonce le défilement.
const DROP_TILE = 'w-[264px] shrink-0 snap-start [&>*]:w-full'

/**
 * Rangée des récompenses tangibles (pièces, cartes) d'un écran de résultat.
 *
 * Empilées verticalement, trois pièces d'équipement repoussaient les boutons
 * du panneau à plusieurs écrans de défilement vertical. À partir de deux
 * récompenses, elles deviennent donc des encarts de largeur fixe qui défilent
 * horizontalement, tous étirés à la même hauteur — une pièce à 4 sous-stats ne
 * doit pas faire une case deux fois plus haute que sa voisine.
 *
 * Une récompense seule garde toute la largeur du panneau : lui imposer la
 * largeur d'un encart la rétrécirait sans rien ranger.
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
    return <div className="mt-4 w-full">{items[0]}</div>
  }
  // La rangée déborde jusqu'aux bords du panneau (marges négatives + rembourrage
  // interne) : le troisième encart est ainsi coupé par le bord au lieu de
  // s'arrêter pile dedans, et le défilement se voit sans avoir à le deviner.
  return (
    <div className="-mx-6 mt-4 w-[calc(100%+3rem)] snap-x snap-mandatory overflow-x-auto overscroll-x-contain px-6 pb-2 sm:-mx-8 sm:w-[calc(100%+4rem)] sm:px-8 [scrollbar-width:thin]">
      <div className="flex items-stretch gap-3">
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
  totalDust,
  totalXp,
  equipmentDrops,
  cardDrops = [],
  onClose,
}: {
  runs: number
  totalGold: number
  totalDust: number
  totalXp: number
  equipmentDrops: EquipmentDrop[]
  cardDrops?: CardDrop[]
  onClose: () => void
}) {
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
        <Dialog.Title className="sr-only">Farm terminé</Dialog.Title>
        <ResultPanel halo>
          <ResultBadge
            className={RESULT_BADGE_WIN}
            icon={<Zap className="h-8 w-8" />}
          />
          <h2 className="mt-4 font-display text-3xl font-bold text-text">
            Farm terminé
          </h2>
          <p className="mt-1 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-text-light/70">
            × {runs} combats
          </p>

          <div className="mt-6 grid w-full grid-cols-3 gap-2.5">
            <RewardTile
              icon={<Coins className="h-5 w-5" />}
              label="Pièces"
              value={totalGold}
              tone="#f59e0b"
            />
            <RewardTile
              icon={<Sparkles className="h-5 w-5" />}
              label="Poussière"
              value={totalDust}
              tone="#38bdf8"
            />
            <RewardTile
              icon={<Star className="h-5 w-5" />}
              label="XP"
              value={totalXp}
              tone="#8b5cf6"
            />
          </div>

          {/* Mêmes fiches que l'écran de victoire : la pièce garde ses stats
              et son bouton « détruire », la carte se voit. Une rangée par
              nature de gain, qui défile dès qu'il y en a plusieurs. */}
          <DropRail>
            {equipmentDrops.map((e) => (
              <EquipmentDropReward key={e.userEquipmentId} drop={e} />
            ))}
          </DropRail>
          <DropRail>
            {cardDrops.map((c, i) => (
              <CardDropReward
                // biome-ignore lint/suspicious/noArrayIndexKey: une même carte peut tomber deux fois dans un balayage
                key={`${c.cardId}-${i}`}
                drop={c}
              />
            ))}
          </DropRail>

          <div className="mt-6 flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-center">
            <Button onClick={onClose} className="gap-2">
              Continuer
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </ResultPanel>
      </PopupContent>
    </Popup>
  )
}
