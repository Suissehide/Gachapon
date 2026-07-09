import { Sparkles, X } from 'lucide-react'
import { useEffect } from 'react'

import type { CardRarity } from '../../../constants/card.constant'
import type { PullBatchEntry } from '../../../queries/useGacha'
import { CardDisplay } from '../../shared/tcg-card/CardDisplay'
import { getRarityTone } from '../../shared/tcg-card/config'

const VARIANT_LABELS: Record<string, string> = {
  BRILLIANT: 'Brillant',
  HOLOGRAPHIC: 'Holographique',
}

type Props = {
  entry: PullBatchEntry
  onClose: () => void
}

/**
 * Fullscreen zoom of a revealed card. Opened by tapping an already-flipped
 * RevealCard. Shows the large interactive card plus its basic pull info — no
 * collection data (level/stats) since that isn't available at reveal time.
 */
export function RevealInspectOverlay({ entry, onClose }: Props) {
  const rarity = entry.card.rarity as CardRarity
  const tone = getRarityTone(rarity)
  const variantLabel = entry.card.variant
    ? VARIANT_LABELS[entry.card.variant]
    : undefined

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: backdrop dismiss pattern — Escape is handled via the window listener above
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-[fadeIn_200ms_ease-out]"
      role="presentation"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer"
        className="absolute right-4 top-4 z-10 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
      >
        <X size={18} />
      </button>

      {/* Only the card + caption swallow the click; the padded area stays inert
       *  so clicking around it closes the overlay. */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: stop-propagation wrapper, not an interactive region */}
      <div
        className="flex flex-col items-center gap-5 duration-300 animate-in fade-in-0 zoom-in-95"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <CardDisplay
          rarity={rarity}
          name={entry.card.name}
          setName={entry.card.set.name}
          imageUrl={entry.card.imageUrl}
          variant={entry.card.variant}
          interactive
          large
        />

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
          {!entry.wasDuplicate && (
            <span className="flex items-center gap-1.5 rounded-full bg-amber-400/95 px-3 py-0.5 text-[11px] font-black uppercase tracking-widest text-[#1b1726]">
              <Sparkles className="h-3 w-3" strokeWidth={2.5} />
              Nouvelle
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
