import { RARITY_OPTIONS } from '../../../constants/card.constant'
import { useAppForm } from '../../../hooks/formConfig'
import type { AdminCardSet } from '../../../queries/useAdminCards'
import { Button } from '../../ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../ui/sheet'

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
  const setOptions = sets.map((s) => ({ value: s.id, label: s.name }))

  const form = useAppForm({
    defaultValues: {
      name: '',
      setId: defaultSetId ?? sets[0]?.id ?? '',
      rarity: 'COMMON',
      dropWeight: 1 as number | undefined,
      image: null as File | null,
    },
    onSubmit: ({ value }) => {
      if (!value.image) {
        return
      }
      const fd = new FormData()
      fd.append('name', value.name)
      fd.append('setId', value.setId)
      fd.append('rarity', value.rarity)
      fd.append('dropWeight', String(value.dropWeight ?? 1))
      fd.append('image', value.image)
      onCreate(fd)
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
      <form.AppField name="image">
        {(f) => <f.FileInput label="Image (jpeg/png/webp)" />}
      </form.AppField>
      <form.Subscribe selector={(s) => s.values.image}>
        {(image) => (
          <Button type="submit" className="w-full" disabled={!image}>
            Créer
          </Button>
        )}
      </form.Subscribe>
    </form>
  )
}
