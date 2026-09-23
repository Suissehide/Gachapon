import { Images, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { CardElement } from '../../../constants/card.constant'
import { RARITY_OPTIONS } from '../../../constants/card.constant'
import { useAppForm } from '../../../hooks/formConfig'
import type { AdminCard } from '../../../queries/useAdminCards'
import type { MediaItem } from '../../../queries/useAdminMedia'
import { ELEMENT_SELECT_OPTIONS } from '../../shared/ElementTag'
import { Button } from '../../ui/button'
import { SegmentedControl } from '../../ui/segmentedControl'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../ui/sheet'
import { MediaPickerModal } from '../media/MediaPickerModal'

export type EditCardPayload = {
  nameFr: string
  nameEn: string
  rarity: string
  dropWeight: number
  baseHp: number
  baseAtk: number
  baseDef: number
  baseSpd: number
  passiveKey: string | null
  element: CardElement | null
  imageUrl?: string | null
  imageFile?: File
}

/**
 * Résout les deux champs image du payload. Extrait de `onSubmit` pour garder
 * ce dernier lisible : `undefined` signifie « ne touche pas à l'image
 * existante », `null` signifie « supprime-la » — la distinction est portée
 * jusqu'au back, d'où les ternaires imbriqués qu'on isole ici.
 */
function resolveImageFields(opts: {
  imageRemoved: boolean
  imageMode: 'upload' | 'pick'
  pickedImageUrl: string | null
  file: File | null
}): Pick<EditCardPayload, 'imageUrl' | 'imageFile'> {
  const { imageRemoved, imageMode, pickedImageUrl, file } = opts
  if (imageRemoved) {
    return { imageUrl: null, imageFile: undefined }
  }
  if (imageMode === 'pick') {
    return { imageUrl: pickedImageUrl ?? undefined, imageFile: undefined }
  }
  return { imageUrl: undefined, imageFile: file ?? undefined }
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
  const { t } = useTranslation('admin')

  const form = useAppForm({
    defaultValues: {
      nameFr: item.nameFr,
      nameEn: item.nameEn,
      rarity: item.rarity,
      dropWeight: item.dropWeight as number | undefined,
      baseHp: item.baseHp as number | undefined,
      baseAtk: item.baseAtk as number | undefined,
      baseDef: item.baseDef as number | undefined,
      baseSpd: item.baseSpd as number | undefined,
      passiveKey: item.passiveKey ?? '',
      element: (item.element ?? '') as CardElement | '',
      image: null as File | null,
    },
    onSubmit: ({ value }) => {
      const trimmedPassive = value.passiveKey.trim()
      onSave({
        nameFr: value.nameFr,
        nameEn: value.nameEn,
        rarity: value.rarity,
        dropWeight: value.dropWeight ?? 1,
        baseHp: value.baseHp ?? item.baseHp,
        baseAtk: value.baseAtk ?? item.baseAtk,
        baseDef: value.baseDef ?? item.baseDef,
        baseSpd: value.baseSpd ?? item.baseSpd,
        passiveKey: trimmedPassive === '' ? null : trimmedPassive,
        element: value.element === '' ? null : value.element,
        ...resolveImageFields({
          imageRemoved,
          imageMode,
          pickedImageUrl,
          file: value.image,
        }),
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
      <form.AppField name="nameFr">
        {(f) => <f.Input label={t('cards.createSheet.nameFrLabel')} />}
      </form.AppField>
      <form.AppField name="nameEn">
        {(f) => <f.Input label={t('cards.createSheet.nameEnLabel')} />}
      </form.AppField>
      <form.AppField name="rarity">
        {(f) => (
          <f.Select
            label={t('cards.createSheet.rarityLabel')}
            options={RARITY_OPTIONS}
          />
        )}
      </form.AppField>
      <form.AppField name="element">
        {(f) => (
          <f.Select
            label={t('cards.createSheet.elementLabel')}
            options={ELEMENT_SELECT_OPTIONS}
            placeholder={t('cards.createSheet.elementPlaceholder')}
          />
        )}
      </form.AppField>
      <form.AppField name="dropWeight">
        {(f) => <f.Number label={t('cards.createSheet.dropWeightLabel')} />}
      </form.AppField>

      <div className="grid grid-cols-2 gap-3">
        <form.AppField name="baseHp">
          {(f) => <f.Number label={t('common:stats.hp')} />}
        </form.AppField>
        <form.AppField name="baseAtk">
          {(f) => <f.Number label={t('common:stats.atk')} />}
        </form.AppField>
        <form.AppField name="baseDef">
          {(f) => <f.Number label={t('common:stats.def')} />}
        </form.AppField>
        <form.AppField name="baseSpd">
          {(f) => <f.Number label={t('common:stats.spd')} />}
        </form.AppField>
      </div>

      <form.AppField name="passiveKey">
        {(f) => <f.Input label={t('cards.createSheet.passiveKeyLabel')} />}
      </form.AppField>

      {/* Image section */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-text-light">
          {t('cards.editSheet.imageLabel')}
        </p>

        {previewUrl ? (
          <div className="group relative overflow-hidden rounded-md border border-border">
            <img
              src={previewUrl}
              alt={t('cards.editSheet.previewAlt')}
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
            <span>{t('cards.editSheet.noImage')}</span>
            <button
              type="button"
              onClick={() => setImageRemoved(false)}
              className="cursor-pointer text-primary hover:underline"
            >
              {t('cards.editSheet.cancel')}
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
            { value: 'upload', label: t('cards.createSheet.uploadOption') },
            { value: 'pick', label: t('cards.createSheet.libraryOption') },
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
              ? t('cards.createSheet.changeImage')
              : t('cards.createSheet.pickFromLibrary')}
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
          {t('cards.editSheet.save')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="border border-destructive/30 text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          {t('cards.editSheet.delete')}
        </Button>
      </div>
    </form>
  )
}
