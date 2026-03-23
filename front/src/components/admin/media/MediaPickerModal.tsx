import { useState } from 'react'

import { type MediaItem, useAdminMedia } from '../../../queries/useAdminMedia'
import {
  Popup,
  PopupBody,
  PopupContent,
  PopupHeader,
  PopupTitle,
} from '../../ui/popup'
import { SegmentedControl } from '../../ui/segmentedControl'
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
          <div className="flex flex-col gap-3 h-[60vh]">
            <SegmentedControl
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'Toutes' },
                { value: 'used', label: 'Utilisées' },
                { value: 'orphan', label: 'Orphelines' },
              ]}
              stretch
            />

            {isLoading ? (
              <div className="flex flex-1 items-center justify-center text-text-light">
                Chargement…
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                <MediaGallery items={filtered} onSelect={handleSelect} />
              </div>
            )}
          </div>
        </PopupBody>
      </PopupContent>
    </Popup>
  )
}
