import type { MediaItem } from '../../../queries/useAdminMedia'
import { Checkbox } from '../../ui/input'

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
    <div className="grid gap-2 grid-cols-[repeat(auto-fill,minmax(6rem,1fr))]">
      {items.map((item) => {
        const isActive = activeKey === item.key
        const isChecked = selected.has(item.key)

        return (
          <button
            key={item.key}
            type="button"
            className={`relative aspect-square w-full cursor-pointer overflow-hidden rounded-md border-2 transition-all ${
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
              className="h-full w-full object-contain p-2"
              onError={(e) => {
                ;(e.target as HTMLImageElement).style.display = 'none'
              }}
            />

            {selectable && item.orphan && (
              <div className="absolute left-1 top-1">
                <Checkbox
                  checked={isChecked}
                  onChange={(e) => {
                    e.stopPropagation()
                    onToggleSelect?.(item.key)
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className={isChecked ? 'border-red-500 bg-red-500/10' : ''}
                />
              </div>
            )}

            <div
              className={`absolute bottom-1 right-1 h-2 w-2 rounded-full ${
                item.orphan ? 'bg-red-500' : 'bg-green-600'
              }`}
            />
          </button>
        )
      })}
    </div>
  )
}
