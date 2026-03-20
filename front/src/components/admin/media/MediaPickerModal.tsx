import { useState } from 'react'

import { type MediaItem, useAdminMedia } from '../../../queries/useAdminMedia'
import {
  Popup,
  PopupBody,
  PopupContent,
  PopupHeader,
  PopupTitle,
} from '../../ui/popup'
import { MediaGallery } from './MediaGallery'

type Filter = 'all' | 'used' | 'orphan'

interface MediaPickerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPick: (item: MediaItem) => void
}

export function MediaPickerModal({
  open,
  onOpenChange,
  onPick,
}: MediaPickerModalProps) {
  const { data: items = [], isLoading } = useAdminMedia()
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = items.filter((item) => {
    if (filter === 'used') {
      return !item.orphan
    }
    if (filter === 'orphan') {
      return item.orphan
    }
    return true
  })

  const handleSelect = (item: MediaItem) => {
    onPick(item)
    onOpenChange(false)
  }

  return (
    <Popup open={open} onOpenChange={onOpenChange}>
      <PopupContent size="xl">
        <PopupHeader>
          <PopupTitle>Choisir une image</PopupTitle>
        </PopupHeader>

        <PopupBody>
          <div className="mb-3 flex gap-2">
            {(['all', 'used', 'orphan'] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                  filter === f
                    ? 'bg-primary/20 text-primary'
                    : 'text-text-light hover:bg-surface'
                }`}
              >
                {f === 'all' && 'Toutes'}
                {f === 'used' && 'Utilisées'}
                {f === 'orphan' && 'Orphelines'}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="flex h-48 items-center justify-center text-text-light">
              Chargement…
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto">
              <MediaGallery items={filtered} onSelect={handleSelect} />
            </div>
          )}
        </PopupBody>
      </PopupContent>
    </Popup>
  )
}
