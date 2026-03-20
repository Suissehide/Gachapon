import type { MediaItem } from '../../../queries/useAdminMedia'

interface MediaGalleryProps {
  items: MediaItem[]
  selectable?: boolean
  selected?: Set<string>
  onToggleSelect?: (key: string) => void
  activeKey?: string | null
  onActivate?: (item: MediaItem) => void
  onSelect?: (item: MediaItem) => void
}

export function MediaGallery({
  items,
  selectable = false,
  selected = new Set(),
  onToggleSelect,
  activeKey = null,
  onActivate,
  onSelect,
}: MediaGalleryProps) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {items.map((item) => {
        const isActive = activeKey === item.key
        const isChecked = selected.has(item.key)

        return (
          <div
            key={item.key}
            className={`relative aspect-square cursor-pointer overflow-hidden rounded-md border-2 transition-all ${
              isChecked
                ? 'border-red-500 bg-red-950/40'
                : isActive
                  ? 'border-violet-500 bg-card'
                  : 'border-transparent bg-card hover:border-border'
            }`}
            onClick={() => {
              if (onSelect) {
                onSelect(item)
              } else if (onActivate) {
                onActivate(item)
              }
            }}
          >
            <img
              src={item.url}
              alt={item.key}
              className="h-full w-full object-contain p-1"
              onError={(e) => {
                ;(e.target as HTMLImageElement).style.display = 'none'
              }}
            />

            {selectable && item.orphan && (
              <button
                type="button"
                className={`absolute left-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                  isChecked
                    ? 'border-red-500 bg-red-500 text-white'
                    : 'border-border bg-background/80'
                }`}
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleSelect?.(item.key)
                }}
              >
                {isChecked && (
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1 4L3 6L7 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                )}
              </button>
            )}

            <div
              className={`absolute bottom-1.5 right-1.5 h-2 w-2 rounded-full ${
                item.orphan ? 'bg-red-500' : 'bg-green-600'
              }`}
            />
          </div>
        )
      })}
    </div>
  )
}
