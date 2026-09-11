// CardZoomPopup — la carte en grand, telle que la collection la montre :
// surcouche sombre, carte `large` qui suit le curseur, et ses badges de
// rareté et de variante dessous.
//
// Volontairement PAS `CardViewModal` : celle-là montre niveau, stats,
// emplacements d'équipement et propose de recycler ou de mettre en vœu. Rien
// de tout ça n'a de sens pour une carte qu'on regarde sans la posséder — le
// butin d'un duel, la main de l'adversaire, le boss d'un raid.
//
// Cette vue existait déjà en deux exemplaires dans `components/team/`
// (`DuelResultPopup.CardZoom`, `RaidPanel.BossCardOverlay`). Elle est posée
// ici pour que la troisième ne soit pas une troisième copie : les deux
// autres devraient l'adopter — voir la note de fin de chantier.
//
// `interactive` et `showAura` ne s'allument QUE dans cette vue : sur une
// grille, une dizaine de cartes qui suivent le curseur coûterait cher pour
// rien.
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
  setName: string
  imageUrl?: string | null
  variant?: string | null
  element?: CardElement | null
}

export function CardZoomPopup({
  card,
  onClose,
}: {
  /** `null` ferme la vue : une seule source de vérité pour l'ouverture. */
  card: ZoomableCard | null
  onClose: () => void
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
            <CardDisplay
              large
              interactive
              showAura
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
