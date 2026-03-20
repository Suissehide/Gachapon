import { Images } from 'lucide-react'
import { useState } from 'react'

import { RARITY_OPTIONS } from '../../../constants/card.constant'
import { useAppForm } from '../../../hooks/formConfig'
import type { AdminCard } from '../../../queries/useAdminCards'
import type { MediaItem } from '../../../queries/useAdminMedia'
import { Button } from '../../ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../ui/sheet'
import { MediaPickerModal } from '../media/MediaPickerModal'

export type EditCardPayload = {
  name: string
  rarity: string
  dropWeight: number
  imageUrl?: string
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
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  const form = useAppForm({
    defaultValues: {
      name: item.name,
      rarity: item.rarity,
      dropWeight: item.dropWeight as number | undefined,
    },
    onSubmit: ({ value }) => {
      onSave({
        name: value.name,
        rarity: value.rarity,
        dropWeight: value.dropWeight ?? 1,
        imageUrl: pickedImageUrl ?? undefined,
        imageFile: uploadedFile ?? undefined,
      })
    },
  })

  const previewUrl = pickedImageUrl ?? item.imageUrl

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

        {previewUrl && (
          <div className="overflow-hidden rounded-md border border-border">
            <img
              src={previewUrl}
              alt="Aperçu"
              className="h-32 w-full object-contain bg-surface"
            />
          </div>
        )}

        {/* Tab buttons */}
        <div className="flex gap-1 rounded-md border border-border p-1 bg-surface">
          <button
            type="button"
            onClick={() => setImageMode('upload')}
            className={`flex-1 rounded px-3 py-1 text-sm font-medium transition-colors ${
              imageMode === 'upload'
                ? 'bg-card text-text'
                : 'text-text-light hover:text-text'
            }`}
          >
            Uploader
          </button>
          <button
            type="button"
            onClick={() => setImageMode('pick')}
            className={`flex-1 rounded px-3 py-1 text-sm font-medium transition-colors ${
              imageMode === 'pick'
                ? 'bg-card text-text'
                : 'text-text-light hover:text-text'
            }`}
          >
            Bibliothèque
          </button>
        </div>

        {imageMode === 'upload' && (
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="w-full text-sm text-text-light file:mr-3 file:rounded file:border-0 file:bg-surface file:px-3 file:py-1 file:text-sm file:text-text file:cursor-pointer"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null
              setUploadedFile(file)
              if (file) setPickedImageUrl(null)
            }}
          />
        )}

        {imageMode === 'pick' && (
          <Button
            type="button"
            variant="ghost"
            className="w-full border border-border gap-2"
            onClick={() => setPickerOpen(true)}
          >
            <Images className="h-4 w-4" />
            {pickedImageUrl ? 'Changer l'image' : 'Choisir depuis la bibliothèque'}
          </Button>
        )}
      </div>

      <MediaPickerModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={(picked: MediaItem) => {
          setPickedImageUrl(picked.url)
          setUploadedFile(null)
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
