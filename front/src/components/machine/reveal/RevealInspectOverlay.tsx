import { Sparkles } from 'lucide-react'

import type { CardRarity } from '../../../constants/card.constant'
import type { PullBatchEntry } from '../../../queries/useGacha'
import { CardZoomOverlay } from '../../shared/tcg-card/CardZoomOverlay'

type Props = {
  entry: PullBatchEntry
  onClose: () => void
}

/**
 * Zoom d'une carte qui vient d'être révélée, ouvert en tapant une carte déjà
 * retournée.
 *
 * La présentation vivait ici ; elle est passée dans
 * `shared/tcg-card/CardZoomOverlay`, d'où trois autres écrans la tirent
 * aussi. Ce fichier ne garde que ce qui est propre au tirage : la forme
 * `PullBatchEntry` et le badge « Nouvelle », qui n'a de sens qu'au moment où
 * la carte tombe — aucune donnée de collection (niveau, stats) n'existe
 * encore à cet instant.
 */
export function RevealInspectOverlay({ entry, onClose }: Props) {
  return (
    <CardZoomOverlay
      card={{
        rarity: entry.card.rarity as CardRarity,
        name: entry.card.name,
        setName: entry.card.set.name,
        imageUrl: entry.card.imageUrl,
        variant: entry.card.variant,
        element: entry.card.element,
      }}
      onClose={onClose}
      extraBadges={
        entry.wasDuplicate ? undefined : (
          <span className="flex items-center gap-1.5 rounded-full bg-amber-400/95 px-3 py-0.5 text-[11px] font-black uppercase tracking-widest text-[#1b1726]">
            <Sparkles className="h-3 w-3" strokeWidth={2.5} />
            Nouvelle
          </span>
        )
      }
    />
  )
}
