import { useLiveFeed } from '../../hooks/useLiveFeed'
import { FeedEntryRow } from './FeedEntry'

export function LiveFeed() {
  const { entries } = useLiveFeed()

  return (
    <div className="fixed right-3 top-20 bottom-4 z-20 w-52 flex flex-col pointer-events-none">
      <div className="pointer-events-auto flex flex-col h-full gap-0.5">
        {/* Header */}
        <div className="flex items-center gap-1.5 px-2 py-1 mb-0.5">
          <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-text-light/30">
            Live
          </span>
        </div>

        {/* Feed scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-px [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {entries.map((entry) => (
            <FeedEntryRow
              key={`${entry.cardId}-${entry.pulledAt}`}
              entry={entry}
            />
          ))}
          {entries.length === 0 && (
            <p className="px-2 py-2 text-[10px] text-text-light/20 italic">
              Aucun tirage récent…
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
