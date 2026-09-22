import { useState } from 'react'

import {
  CURRENCY_OPTIONS,
  ITEM_TYPE_OPTIONS,
} from '../../../constants/shop.constant'
import { useAppForm } from '../../../hooks/formConfig'
import { Button } from '../../ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../ui/sheet'

export type CreateShopItemPayload = {
  nameFr: string
  nameEn: string
  descriptionFr: string
  descriptionEn: string
  type: string
  cost: number
  currency: string
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

function CreateShopItemForm({
  onCreate,
}: {
  onCreate: (item: CreateShopItemPayload) => void
}) {
  const [jsonError, setJsonError] = useState('')

  const form = useAppForm({
    defaultValues: {
      nameFr: '',
      nameEn: '',
      descriptionFr: '',
      descriptionEn: '',
      type: 'TOKEN_PACK',
      cost: 0 as number,
      currency: 'DUST',
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
      onCreate({ ...value, cost: value.cost ?? 0, value: parsed })
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
      <form.AppField name="nameFr">
        {(field) => <field.Input label="Nom (français)" />}
      </form.AppField>
      <form.AppField name="nameEn">
        {(field) => <field.Input label="Nom (anglais)" />}
      </form.AppField>
      <form.AppField name="descriptionFr">
        {(field) => <field.Input label="Description (français)" />}
      </form.AppField>
      <form.AppField name="descriptionEn">
        {(field) => <field.Input label="Description (anglais)" />}
      </form.AppField>
      <form.AppField name="type">
        {(field) => <field.Select label="Type" options={ITEM_TYPE_OPTIONS} />}
      </form.AppField>
      <form.AppField name="cost">
        {(field) => <field.Number label="Coût" />}
      </form.AppField>
      <form.AppField name="currency">
        {(field) => <field.Select label="Monnaie" options={CURRENCY_OPTIONS} />}
      </form.AppField>
      <form.AppField name="value">
        {(field) => <field.TextArea label='Valeur JSON (ex: {"tokens":3})' />}
      </form.AppField>
      <form.AppField name="isActive">
        {(field) => (
          <field.Toggle label="Statut" options={['Actif', 'Inactif']} />
        )}
      </form.AppField>
      {jsonError && <p className="text-xs text-destructive">{jsonError}</p>}
      <Button type="submit" className="w-full">
        Créer
      </Button>
    </form>
  )
}
