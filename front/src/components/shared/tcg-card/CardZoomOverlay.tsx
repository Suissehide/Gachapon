// CardZoomOverlay — LA vue agrandie d'une carte, partout dans le jeu :
// surcouche sombre plein écran, carte `large` qui suit le curseur, et ses
// badges de rareté et de variante dessous.
//
// Elle vient du zoom de tirage (`RevealInspectOverlay`), qui l'avait en
// propre. Trois autres écrans en avaient chacun une copie — le butin d'un
// duel réglé, la main d'un duel terminé, le boss d'un raid — avec trois
// présentations légèrement différentes. C'est celle-ci qui les remplace :
// elle est la plus aboutie, et c'est le traitement que le joueur voit déjà
// au moment le plus marquant du jeu.
//
// Volontairement PAS `CardViewModal` : celle-là montre niveau, stats,
// emplacements d'équipement et propose de recycler ou de mettre en vœu, ce
// qui n'a aucun sens pour une carte qu'on regarde sans la posséder — la main
// de l'adversaire, un boss, un tirage qui vient de tomber.
//
// `interactive` et `showAura` ne s'allument QUE dans cette vue : sur une
// grille, une dizaine de cartes qui suivent le curseur coûterait cher pour
// rien.
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

import type { CardElement } from '../../../constants/card.constant.ts'
import { Button } from '../../ui/button.tsx'
import { CardDisplay } from './CardDisplay.tsx'
import { getRarityTone } from './config.ts'

const VARIANT_LABEL_FR: Record<string, string> = {
  BRILLIANT: 'Brillante',
  HOLOGRAPHIC: 'Holographique',
}

export type ZoomableCard = {
  rarity: string
  name: string
  /** Chaîne vide = pas de fil d'ariane (un boss de raid n'appartient à aucun set). */
  setName: string
  imageUrl?: string | null
  variant?: string | null
  element?: CardElement | null
  /** Grise la carte quand elle n'est pas (ou plus) à soi. Vrai par défaut. */
  isOwned?: boolean
  /** Halo derrière la carte. Vrai par défaut : c'est la vue où il se justifie. */
  showAura?: boolean
}

export function CardZoomOverlay({
  card,
  onClose,
  header,
  extraBadges,
}: {
  /** `null` ferme la vue : une seule source de vérité pour l'ouverture. */
  card: ZoomableCard | null
  onClose: () => void
  /**
   * Ce qui se pose AU-DESSUS de la carte — la puissance d'un boss de raid.
   * Au-dessus et non dessous : le dessous appartient aux badges de rareté et
   * de variante, les mêmes partout, qui servent de repère commun.
   */
  header?: ReactNode
  /** Badges ajoutés à la suite des deux autres — « Nouvelle » sur un tirage. */
  extraBadges?: ReactNode
}) {
  const rootRef = useRef<HTMLDivElement>(null)

  // Échap est écouté en phase de CAPTURE, et la propagation coupée. Cette vue
  // s'ouvre parfois DANS une modale Radix (le butin d'un duel réglé), qui
  // écoute elle aussi Échap sur le document : sans cette capture, une seule
  // touche fermerait le zoom ET la liste derrière lui.
  useEffect(() => {
    if (card === null) {
      return
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [card, onClose])

  // Radix ferme une modale sur un `pointerdown` qu'il juge « en dehors » : il
  // écoute sur le document et regarde si la cible est dans SA couche. Ce
  // portail est hors de cette couche, donc chaque clic dans le zoom — y
  // compris celui qui ne fait que le fermer — passait pour un clic dehors et
  // fermait la liste derrière.
  //
  // L'écouteur est posé sur la RACINE de la surcouche, en phase de remontée,
  // et non sur le document en capture : couper la propagation en capture
  // depuis le document empêcherait aussi l'évènement de DESCENDRE jusqu'à la
  // carte, et plus rien ne serait cliquable à l'intérieur. Ici l'évènement
  // atteint sa cible normalement, puis s'arrête avant le document.
  useEffect(() => {
    const node = rootRef.current
    if (card === null || node === null) {
      return
    }
    const stop = (e: Event) => e.stopPropagation()
    node.addEventListener('pointerdown', stop)
    return () => node.removeEventListener('pointerdown', stop)
  }, [card])

  if (card === null) {
    return null
  }

  const tone = getRarityTone(card.rarity)
  const variantLabel =
    card.variant != null && card.variant !== 'NORMAL'
      ? (VARIANT_LABEL_FR[card.variant] ?? card.variant)
      : undefined

  // Rendue DANS `document.body`, et ce n'est pas un raffinement : cette vue
  // s'ouvre parfois à l'intérieur d'une modale, dont le conteneur porte un
  // `translate`. Un ancêtre transformé devient le référentiel des enfants
  // `position: fixed` — sans ce portail, `inset-0` se calerait sur la boîte
  // de la modale au lieu de l'écran, et la surcouche serait enfermée dedans.
  return createPortal(
    // `z-[110]` et non 60 : les modales du projet sont en z-100, et cette vue
    // s'ouvre par-dessus l'une d'elles.
    // biome-ignore lint/a11y/noStaticElementInteractions: fermeture au clic sur le fond ; Échap est géré par l'écouteur ci-dessus
    <div
      ref={rootRef}
      // `pointer-events-auto` n'est pas redondant : tant qu'une modale Radix
      // est ouverte, elle pose `pointer-events: none` sur `document.body`, et
      // ce portail en hérite. Sans cette ligne la surcouche ne reçoit plus la
      // souris du tout — pas de survol sur la carte, et les clics traversent
      // jusqu'à la modale en dessous.
      className="pointer-events-auto fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-[fadeIn_200ms_ease-out]"
      role="presentation"
      onClick={onClose}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        aria-label="Fermer"
        className="absolute right-4 top-4 z-10 rounded-full border border-white/15 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
      >
        <X size={18} />
      </Button>

      {/* Seuls la carte et sa légende avalent le clic ; la marge autour reste
       *  inerte, donc cliquer à côté ferme. */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: enveloppe d'arrêt de propagation, pas une zone interactive */}
      <div
        className="flex flex-col items-center gap-5 duration-300 animate-in fade-in-0 zoom-in-95"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {header}

        <CardDisplay
          large
          interactive
          showAura={card.showAura ?? true}
          isOwned={card.isOwned ?? true}
          rarity={card.rarity}
          name={card.name}
          setName={card.setName}
          showSetName={card.setName !== ''}
          imageUrl={card.imageUrl}
          variant={card.variant}
          element={card.element}
        />

        {/* Badges dessinés pour un fond SOMBRE : le `Badge` de `ui/` est
            calibré pour les surfaces claires et s'y perdrait. */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span
            className="rounded-full px-3 py-0.5 text-[11px] font-black uppercase tracking-widest text-white"
            style={{ backgroundColor: tone.hex }}
          >
            {tone.label}
          </span>
          {variantLabel && (
            <span className="rounded-full border border-white/25 bg-white/10 px-3 py-0.5 text-[11px] font-bold uppercase tracking-widest text-white/90">
              {variantLabel}
            </span>
          )}
          {extraBadges}
        </div>
      </div>
    </div>,
    document.body,
  )
}
