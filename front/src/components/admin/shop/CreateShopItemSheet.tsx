import { useState } from 'react'

import { Button } from '../../ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '../../ui/sheet'
import { ITEM_TYPE_OPTIONS } from '../../../constants/shop.constant'
import { useAppForm } from '../../../hooks/formConfig'

export type CreateShopItemPayload = {
  name: string
  description: string
  type: string
  dustCost: number
  value: unknown
  isActive: boolean
}

interface CreateShopItemSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (item: CreateShopItemPayload) => void
}

export function CreateShopItemSheet({
  open,
  onOpenChange,
  onCreate,
}: CreateShopItemSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Créer un item</SheetTitle>
        </SheetHeader>
        <div className="mt-6 px-6">
          <CreateShopItemForm onCreate={onCreate} />
        </div>
      </SheetContent>
    </Sheet>
  )
}

function CreateShopItemForm({ onCreate }: { onCreate: (item: CreateShopItemPayload) => void }) {
  const [jsonError, setJsonError] = useState('')

  const form = useAppForm({
    defaultValues: {
      name: '',
      description: '',
      type: 'TOKEN_PACK',
      dustCost: 0 as number,
      value: '{}',
      isActive: true,
    },
    onSubmit: ({ value }) => {
      let parsed: unknown
      try {
        parsed = JSON.parse(value.value)
      } catch {
        setJsonError('JSON invalide — vérifiez la syntaxe')
        return
      }
      setJsonError('')
      onCreate({ ...value, dustCost: value.dustCost ?? 0, value: parsed })
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
        {(field) => <field.Input label="Nom" />}
      </form.AppField>
      <form.AppField name="description">
        {(field) => <field.Input label="Description" />}
      </form.AppField>
      <form.AppField name="type">
        {(field) => <field.Select label="Type" options={ITEM_TYPE_OPTIONS} />}
      </form.AppField>
      <form.AppField name="dustCost">
        {(field) => <field.Number label="Coût (dust)" />}
      </form.AppField>
      <form.AppField name="value">
        {(field) => <field.TextArea label='Valeur JSON (ex: {"tokens":3})' />}
      </form.AppField>
      <form.AppField name="isActive">
        {(field) => <field.Toggle label="Statut" options={['Actif', 'Inactif']} />}
      </form.AppField>
      {jsonError && <p className="text-xs text-red-400">{jsonError}</p>}
      <Button type="submit" className="w-full">
        Créer
      </Button>
    </form>
  )
}
