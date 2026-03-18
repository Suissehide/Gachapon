import { useState } from 'react'

import { Button } from '../../ui/button'
import { Label } from '../../ui/label'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '../../ui/sheet'
import { RARITY_OPTIONS } from '../../../constants/card.constant'
import { useAppForm } from '../../../hooks/formConfig'
import type { AdminCardSet } from '../../../queries/useAdminCards'

interface CreateCardSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (fd: FormData) => void
  sets: AdminCardSet[]
  defaultSetId?: string | null
}

export function CreateCardSheet({
  open,
  onOpenChange,
  onCreate,
  sets,
  defaultSetId,
}: CreateCardSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Ajouter une carte</SheetTitle>
        </SheetHeader>
        <div className="mt-6 px-6">
          <CreateCardForm
            key={defaultSetId ?? 'none'}
            sets={sets}
            defaultSetId={defaultSetId}
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
  onCreate,
}: {
  sets: AdminCardSet[]
  defaultSetId?: string | null
  onCreate: (fd: FormData) => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [fileKey, setFileKey] = useState(0)

  const setOptions = sets.map((s) => ({ value: s.id, label: s.name }))

  const form = useAppForm({
    defaultValues: {
      name: '',
      setId: defaultSetId ?? (sets[0]?.id ?? ''),
      rarity: 'COMMON',
      dropWeight: 1 as number | undefined,
    },
    onSubmit: ({ value }) => {
      if (!file) {
        return
      }
      const fd = new FormData()
      fd.append('name', value.name)
      fd.append('setId', value.setId)
      fd.append('rarity', value.rarity)
      fd.append('dropWeight', String(value.dropWeight ?? 1))
      fd.append('image', file)
      onCreate(fd)
      setFile(null)
      setFileKey((k) => k + 1)
    },
  })

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
      <div className="flex flex-col gap-1">
        <Label>Image (jpeg/png/webp)</Label>
        <input
          key={fileKey}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm text-text-light"
        />
      </div>
      <Button type="submit" className="w-full" disabled={!file}>
        Créer
      </Button>
    </form>
  )
}
