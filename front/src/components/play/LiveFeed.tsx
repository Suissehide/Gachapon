import { PanelRightClose, PanelRightOpen } from 'lucide-react'
import { useState } from 'react'

import { useLiveFeed } from '../../hooks/useLiveFeed'
import { Button } from '../ui/button'
import { FeedEntryRow } from './FeedEntry'

export function LiveFeed() {
  const { entries } = useLiveFeed()
  const [visible, setVisible] = useState(true)

  return (
    <div className="fixed right-3 top-20 bottom-4 z-20 flex flex-col items-end gap-2 pointer-events-none">
      {/* Bouton toujours au même endroit, jamais dans le panneau */}
      <Button
        variant="outline"
        size="icon-sm"
        className="pointer-events-auto shrink-0"
        onClick={() => setVisible((v) => !v)}
        title={visible ? 'Cacher le feed live' : 'Afficher le feed live'}
      >
        {visible ? <PanelRightClose size={13} /> : <PanelRightOpen size={13} />}
      </Button>

      {visible && (
        <div className="pointer-events-auto w-52 flex-1 min-h-0 flex flex-col rounded-xl overflow-hidden bg-white/80 backdrop-blur-sm border border-border shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
          {/* Header */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
            <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-text-light">
              Live
            </span>
          </div>

          {/* Feed — flex-col-reverse : entries[0] (newest) renders at the visual bottom */}
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col-reverse py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {entries.length === 0 ? (
              <p className="px-3 py-3 text-[10px] text-text-light/50 italic">
                Aucun tirage récent…
              </p>
            ) : (
              entries.map((entry) => (
                <FeedEntryRow
                  key={`${entry.cardId}-${entry.pulledAt}`}
                  entry={entry}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
