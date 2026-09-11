// Détail d'un duel réglé : les cartes qui ont changé de main.
//
// Le compte (`transferredCount`) voyage avec l'historique ; la LISTE, elle,
// se charge à l'ouverture — vingt duels réglés font vingt requêtes qu'aucun
// écran n'aurait affichées.
//
// `toMe` vient du serveur et non d'une comparaison d'identifiants côté
// client : la popup se contente de le lire, et un spectateur (membre de
// l'équipe mais pas du duel) obtient partout `false`, ce qui est exact —
// aucune de ces cartes n'est venue chez lui.
import { Layers } from 'lucide-react'
import { useState } from 'react'

import { plural } from '../../../libs/utils.ts'
import { useDuelTransfers } from '../../../queries/useWagers.ts'
import {
  CardZoomOverlay,
  type ZoomableCard,
} from '../../shared/tcg-card/CardZoomOverlay.tsx'
import { TcgCardFace } from '../../shared/tcg-card/TcgCardFace.tsx'
import { Button } from '../../ui/button.tsx'
import {
  Popup,
  PopupBody,
  PopupContent,
  PopupHeader,
  PopupTitle,
} from '../../ui/popup.tsx'

export function DuelCardsPopup({
  teamId,
  duelId,
  title,
  onClose,
}: {
  teamId: string
  /** `null` ferme la popup ET coupe la requête (`enabled`). */
  duelId: string | null
  title: string
  onClose: () => void
}) {
  const { data, isLoading, isError } = useDuelTransfers(teamId, duelId)
  const transfers = data?.transfers ?? []
  const [zoomed, setZoomed] = useState<ZoomableCard | null>(null)

  return (
    <Popup open={duelId !== null} onOpenChange={(open) => !open && onClose()}>
      <PopupContent size="lg">
        <PopupHeader>
          <PopupTitle icon={<Layers className="h-4 w-4" />} subtitle={title}>
            Cartes du duel
          </PopupTitle>
        </PopupHeader>

        <PopupBody>
          {isLoading ? (
            <p className="py-6 text-center text-sm text-text-light">
              Chargement des cartes…
            </p>
          ) : isError ? (
            <p className="py-6 text-center text-sm text-destructive">
              Impossible de charger les cartes de ce duel.
            </p>
          ) : transfers.length === 0 ? (
            <p className="py-6 text-center text-sm text-text-light">
              Aucune carte n’a changé de main sur ce duel.
            </p>
          ) : (
            <>
              <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-foreground/45">
                {transfers.length} carte{plural(transfers.length)} transférée
                {plural(transfers.length)}
              </p>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                {transfers.map((transfer) => (
                  // `TcgCardFace` remplit son parent : sans ce cadre au
                  // ratio 2/3 il s'étire à la hauteur de la grille et la
                  // carte sort recadrée et démesurée. Même enveloppe que
                  // `MiniCardFace` dans `TeamEditorPopup`.
                  //
                  // Le cadre est un vrai `button` et non un `div` cliquable :
                  // la vignette s'ouvre aussi au clavier, et le focus se voit.
                  <Button
                    key={transfer.id}
                    type="button"
                    variant="ghost"
                    size="bare"
                    onClick={() =>
                      setZoomed({
                        rarity: transfer.card.rarity,
                        name: transfer.card.name,
                        setName: transfer.card.set.name,
                        imageUrl: transfer.card.imageUrl,
                        variant: transfer.variant,
                        element: transfer.card.element,
                      })
                    }
                    aria-label={`Agrandir ${transfer.card.name}`}
                    className="relative aspect-[2/3] w-full rounded-[8px] hover:-translate-y-0.5 hover:bg-transparent"
                  >
                    <TcgCardFace
                      rarity={transfer.card.rarity}
                      name={transfer.card.name}
                      setName={transfer.card.set.name}
                      imageUrl={transfer.card.imageUrl}
                      variant={transfer.variant}
                      isOwned={transfer.toMe}
                      compact
                    />
                  </Button>
                ))}
              </div>
            </>
          )}
        </PopupBody>
      </PopupContent>

      {/* Imbriquée dans celle-ci : la liste reste derrière, et fermer le zoom
          y ramène — le joueur n'a pas à rouvrir l'historique entre deux
          cartes. */}
      <CardZoomOverlay card={zoomed} onClose={() => setZoomed(null)} />
    </Popup>
  )
}
