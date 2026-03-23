import { Images, X } from 'lucide-react'
import { useState } from 'react'

import { RARITY_OPTIONS } from '../../../constants/card.constant'
import { useAppForm } from '../../../hooks/formConfig'
import type { AdminCard } from '../../../queries/useAdminCards'
import type { MediaItem } from '../../../queries/useAdminMedia'
import { Button } from '../../ui/button'
import { SegmentedControl } from '../../ui/segmentedControl'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../ui/sheet'
import { MediaPickerModal } from '../media/MediaPickerModal'

export type EditCardPayload = {
  name: string
  rarity: string
  dropWeight: number
  imageUrl?: string | null
  imageFile?: File
}

interface EditCardSheetProps {
  item: AdminCard | null
  onOpenChange: (open: boolean) => void
  onSave: (data: EditCardPayload) => void
  onDelete: () => void
}

export function EditCardSheet({
  item,
  onOpenChange,
  onSave,
  onDelete,
}: EditCardSheetProps) {
  return (
    <Sheet open={!!item} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{item?.name ?? ''}</SheetTitle>
        </SheetHeader>
        {item && (
          <div className="mt-6 px-6">
            <EditCardForm
              key={item.id}
              item={item}
              onSave={onSave}
              onDelete={onDelete}
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function EditCardForm({
  item,
  onSave,
  onDelete,
}: {
  item: AdminCard
  onSave: (data: EditCardPayload) => void
  onDelete: () => void
}) {
  const [imageMode, setImageMode] = useState<'upload' | 'pick'>('upload')
  const [pickedImageUrl, setPickedImageUrl] = useState<string | null>(null)
  const [imageRemoved, setImageRemoved] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  const form = useAppForm({
    defaultValues: {
      name: item.name,
      rarity: item.rarity,
      dropWeight: item.dropWeight as number | undefined,
      image: null as File | null,
    },
    onSubmit: ({ value }) => {
      onSave({
        name: value.name,
        rarity: value.rarity,
        dropWeight: value.dropWeight ?? 1,
        imageUrl: imageRemoved
          ? null
          : imageMode === 'pick'
            ? (pickedImageUrl ?? undefined)
            : undefined,
        imageFile:
          !imageRemoved && imageMode === 'upload' ? (value.image ?? undefined) : undefined,
      })
    },
  })

  const previewUrl = imageRemoved ? null : (pickedImageUrl ?? item.imageUrl)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
      className="space-y-3"
    >
      <form.AppField name="name">
        {(f) => <f.Input label="Nom" />}
      </form.AppField>
      <form.AppField name="rarity">
        {(f) => <f.Select label="Rareté" options={RARITY_OPTIONS} />}
      </form.AppField>
      <form.AppField name="dropWeight">
        {(f) => <f.Number label="Poids de drop" />}
      </form.AppField>

      {/* Image section */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-text-light">Image</p>

        {previewUrl ? (
          <div className="group relative overflow-hidden rounded-md border border-border">
            <img
              src={previewUrl}
              alt="Aperçu"
              className="h-32 w-full object-contain bg-surface"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/40">
              <button
                type="button"
                onClick={() => {
                  if (pickedImageUrl) {
                    setPickedImageUrl(null)
                  } else {
                    setImageRemoved(true)
                  }
                }}
                className="cursor-pointer rounded-full bg-destructive/90 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : imageRemoved ? (
          <div className="flex items-center justify-between rounded-md border border-dashed border-border px-3 py-2 text-xs text-text-light">
            <span>Aucune image</span>
            <button
              type="button"
              onClick={() => setImageRemoved(false)}
              className="cursor-pointer text-primary hover:underline"
            >
              Annuler
            </button>
          </div>
        ) : null}

        <SegmentedControl
          value={imageMode}
          onChange={(mode) => {
            setImageMode(mode)
            if (mode === 'upload') {
              setPickedImageUrl(null)
            }
          }}
          options={[
            { value: 'upload', label: 'Upload' },
            { value: 'pick', label: 'Bibliothèque' },
          ]}
          stretch
        />

        {imageMode === 'upload' ? (
          <form.AppField name="image">
            {(f) => <f.FileInput label="" />}
          </form.AppField>
        ) : (
          <Button
            type="button"
            variant="ghost"
            className="w-full border border-border gap-2"
            onClick={() => setPickerOpen(true)}
          >
            <Images className="h-4 w-4" />
            {pickedImageUrl
              ? "Changer l'image"
              : 'Choisir depuis la bibliothèque'}
          </Button>
        )}
      </div>

      <MediaPickerModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={(picked: MediaItem) => {
          setPickedImageUrl(picked.url)
          setImageRemoved(false)
          setPickerOpen(false)
        }}
      />

      <div className="flex gap-2 pt-2">
        <Button type="submit" className="flex-1">
          Sauvegarder
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="border border-red-500/30 text-red-400 hover:text-red-400"
          onClick={onDelete}
        >
          Supprimer
        </Button>
      </div>
    </form>
  )
}
