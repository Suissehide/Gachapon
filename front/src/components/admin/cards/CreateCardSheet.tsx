import { useStore } from '@tanstack/react-form'
import { Images, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { RARITY_OPTIONS } from '../../../constants/card.constant'
import { useAppForm } from '../../../hooks/formConfig'
import type { AdminCardSet } from '../../../queries/useAdminCards'
import type { MediaItem } from '../../../queries/useAdminMedia'
import { Button } from '../../ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../ui/sheet'
import { SegmentedControl } from '../../ui/segmentedControl'
import { MediaPickerModal } from '../media/MediaPickerModal'

const STATS_BY_RARITY: Record<
  string,
  { baseHp: number; baseAtk: number; baseDef: number; baseSpd: number }
> = {
  COMMON: { baseHp: 100, baseAtk: 10, baseDef: 5, baseSpd: 90 },
  UNCOMMON: { baseHp: 140, baseAtk: 14, baseDef: 7, baseSpd: 95 },
  RARE: { baseHp: 200, baseAtk: 20, baseDef: 10, baseSpd: 100 },
  EPIC: { baseHp: 320, baseAtk: 32, baseDef: 16, baseSpd: 105 },
  LEGENDARY: { baseHp: 500, baseAtk: 50, baseDef: 25, baseSpd: 110 },
}

const DEFAULT_RARITY = 'COMMON'
const DEFAULT_STATS = STATS_BY_RARITY[DEFAULT_RARITY]

interface CreateCardSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (fd: FormData) => void
  sets: AdminCardSet[]
  defaultSetId?: string | null
  defaultImageUrl?: string
}

export function CreateCardSheet({
  open,
  onOpenChange,
  onCreate,
  sets,
  defaultSetId,
  defaultImageUrl,
}: CreateCardSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Ajouter une carte</SheetTitle>
        </SheetHeader>
        <div className="mt-6 px-6">
          <CreateCardForm
            key={`${defaultSetId ?? 'none'}-${defaultImageUrl ?? ''}`}
            sets={sets}
            defaultSetId={defaultSetId}
            defaultImageUrl={defaultImageUrl}
            onCreate={(fd) => {
              onCreate(fd)
              onOpenChange(false)
            }}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}

function CreateCardForm({
  sets,
  defaultSetId,
  defaultImageUrl,
  onCreate,
}: {
  sets: AdminCardSet[]
  defaultSetId?: string | null
  defaultImageUrl?: string
  onCreate: (fd: FormData) => void
}) {
  const [imageMode, setImageMode] = useState<'upload' | 'pick'>(
    defaultImageUrl ? 'pick' : 'upload',
  )
  const [pickedUrl, setPickedUrl] = useState<string | null>(defaultImageUrl ?? null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const userTouchedStatsRef = useRef(false)

  const setOptions = sets.map((s) => ({ value: s.id, label: s.name }))

  const form = useAppForm({
    defaultValues: {
      name: '',
      setId: defaultSetId ?? sets[0]?.id ?? '',
      rarity: DEFAULT_RARITY,
      dropWeight: 1 as number | undefined,
      baseHp: DEFAULT_STATS.baseHp as number | undefined,
      baseAtk: DEFAULT_STATS.baseAtk as number | undefined,
      baseDef: DEFAULT_STATS.baseDef as number | undefined,
      baseSpd: DEFAULT_STATS.baseSpd as number | undefined,
      passiveKey: '',
      image: null as File | null,
    },
    onSubmit: ({ value }) => {
      if (imageMode === 'upload' && !value.image) return
      if (imageMode === 'pick' && !pickedUrl) return

      const fd = new FormData()
      fd.append('name', value.name)
      fd.append('setId', value.setId)
      fd.append('rarity', value.rarity)
      fd.append('dropWeight', String(value.dropWeight ?? 1))
      fd.append('baseHp', String(value.baseHp ?? DEFAULT_STATS.baseHp))
      fd.append('baseAtk', String(value.baseAtk ?? DEFAULT_STATS.baseAtk))
      fd.append('baseDef', String(value.baseDef ?? DEFAULT_STATS.baseDef))
      fd.append('baseSpd', String(value.baseSpd ?? DEFAULT_STATS.baseSpd))
      if (value.passiveKey.trim()) {
        fd.append('passiveKey', value.passiveKey.trim())
      }
      if (imageMode === 'upload' && value.image) {
        fd.append('image', value.image)
      } else if (pickedUrl) {
        fd.append('imageUrl', pickedUrl)
      }
      onCreate(fd)
    },
  })

  // Watch rarity changes to pre-fill stats — only when user hasn't manually edited them.
  const rarity = useStore(form.store, (s) => s.values.rarity)
  useEffect(() => {
    if (userTouchedStatsRef.current) return
    const preset = STATS_BY_RARITY[rarity]
    if (!preset) return
    form.setFieldValue('baseHp', preset.baseHp)
    form.setFieldValue('baseAtk', preset.baseAtk)
    form.setFieldValue('baseDef', preset.baseDef)
    form.setFieldValue('baseSpd', preset.baseSpd)
  }, [rarity, form])

  const markStatsTouched = () => {
    userTouchedStatsRef.current = true
  }

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
      <form.AppField name="setId">
        {(f) => <f.Select label="Set" options={setOptions} />}
      </form.AppField>
      <form.AppField name="rarity">
        {(f) => <f.Select label="Rareté" options={RARITY_OPTIONS} />}
      </form.AppField>
      <form.AppField name="dropWeight">
        {(f) => <f.Number label="Poids de drop" />}
      </form.AppField>

      <div className="grid grid-cols-2 gap-3" onInput={markStatsTouched}>
        <form.AppField name="baseHp">
          {(f) => <f.Number label="HP" />}
        </form.AppField>
        <form.AppField name="baseAtk">
          {(f) => <f.Number label="ATK" />}
        </form.AppField>
        <form.AppField name="baseDef">
          {(f) => <f.Number label="DEF" />}
        </form.AppField>
        <form.AppField name="baseSpd">
          {(f) => <f.Number label="SPD" />}
        </form.AppField>
      </div>

      <form.AppField name="passiveKey">
        {(f) => <f.Input label="Passif (clé, optionnel)" />}
      </form.AppField>

      <div className="space-y-2">
        <SegmentedControl
          value={imageMode}
          onChange={(mode) => {
            setImageMode(mode)
            if (mode === 'upload') setPickedUrl(null)
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
          <div className="space-y-2">
            {pickedUrl && (
              <div className="group relative overflow-hidden rounded-md border border-border">
                <img
                  src={pickedUrl}
                  alt="Image sélectionnée"
                  className="h-32 w-full object-contain bg-surface"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/40">
                  <button
                    type="button"
                    onClick={() => setPickedUrl(null)}
                    className="rounded-full bg-destructive/90 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
            <Button
              type="button"
              variant="ghost"
              className="w-full border border-border gap-2"
              onClick={() => setPickerOpen(true)}
            >
              <Images className="h-4 w-4" />
              {pickedUrl ? "Changer l'image" : 'Choisir depuis la bibliothèque'}
            </Button>
          </div>
        )}
      </div>

      <MediaPickerModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={(item: MediaItem) => {
          setPickedUrl(item.url)
          setPickerOpen(false)
        }}
      />

      <form.Subscribe selector={(s) => s.values.image}>
        {(image) => (
          <Button
            type="submit"
            className="w-full"
            disabled={
              (imageMode === 'upload' && !image) ||
              (imageMode === 'pick' && !pickedUrl)
            }
          >
            Créer
          </Button>
        )}
      </form.Subscribe>
    </form>
  )
}
