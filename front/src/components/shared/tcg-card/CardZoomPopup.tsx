// CardZoomPopup — la carte en grand, telle que la collection la montre :
// surcouche sombre, carte `large` qui suit le curseur, et ses badges de
// rareté et de variante dessous.
//
// Volontairement PAS `CardViewModal` : celle-là montre niveau, stats,
// emplacements d'équipement et propose de recycler ou de mettre en vœu. Rien
// de tout ça n'a de sens pour une carte qu'on regarde sans la posséder — le
// butin d'un duel, la main de l'adversaire, le boss d'un raid.
//
// Elle remplace les copies qui vivaient dans `DuelResultPopup.CardZoom` et
// `RaidPanel.BossCardOverlay`.
//
// `RevealInspectOverlay` NE l'utilise pas, et c'est délibéré : cette
// surcouche-là est sombre, posée sur le canvas 3D du tirage, avec ses
// propres badges blancs et son bouton de fermeture. L'y plier ferait perdre
// un moment volontairement différent — l'uniformité sert les écrans qui se
// ressemblent, pas ceux qui ne se ressemblent pas.
//
// `interactive` et `showAura` ne s'allument QUE dans cette vue : sur une
// grille, une dizaine de cartes qui suivent le curseur coûterait cher pour
// rien.
import type { ReactNode } from 'react'

import type { CardElement } from '../../../constants/card.constant.ts'
import { RARITY_BADGE_VARIANT, RARITY_LABEL_FR } from '../../../libs/rarity.ts'
import { Badge } from '../../ui/badge.tsx'
import { Popup, PopupBody, PopupContent } from '../../ui/popup.tsx'
import { CardDisplay } from './CardDisplay.tsx'

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

export function CardZoomPopup({
  card,
  onClose,
  header,
}: {
  /** `null` ferme la vue : une seule source de vérité pour l'ouverture. */
  card: ZoomableCard | null
  onClose: () => void
  /**
   * Ce qui se pose AU-DESSUS de la carte — la puissance d'un boss de raid.
   * Au-dessus et non dessous : le dessous appartient aux badges de rareté et
   * de variante, qui sont les mêmes partout et servent de repère commun.
   */
  header?: ReactNode
}) {
  return (
    <Popup
      open={card !== null}
      onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}
    >
      {card !== null && (
        <PopupContent className="w-auto max-w-none">
          <PopupBody className="flex flex-col items-center gap-3">
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
            <div className="flex items-center gap-2">
              <Badge variant={RARITY_BADGE_VARIANT[card.rarity] ?? 'common'}>
                {RARITY_LABEL_FR[card.rarity] ?? card.rarity}
              </Badge>
              {card.variant != null && card.variant !== 'NORMAL' && (
                <Badge variant="neutral">
                  {VARIANT_LABEL_FR[card.variant] ?? card.variant}
                </Badge>
              )}
            </div>
          </PopupBody>
        </PopupContent>
      )}
    </Popup>
  )
}
