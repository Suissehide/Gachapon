import { useState } from 'react'
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation('admin')
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{t('shop.createSheet.title')}</SheetTitle>
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
  const { t } = useTranslation('admin')

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
        setJsonError(t('shop.createSheet.invalidJson'))
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
        {(field) => <field.Input label={t('shop.createSheet.nameFrLabel')} />}
      </form.AppField>
      <form.AppField name="nameEn">
        {(field) => <field.Input label={t('shop.createSheet.nameEnLabel')} />}
      </form.AppField>
      <form.AppField name="descriptionFr">
        {(field) => (
          <field.Input label={t('shop.createSheet.descriptionFrLabel')} />
        )}
      </form.AppField>
      <form.AppField name="descriptionEn">
        {(field) => (
          <field.Input label={t('shop.createSheet.descriptionEnLabel')} />
        )}
      </form.AppField>
      <form.AppField name="type">
        {(field) => (
          <field.Select
            label={t('shop.createSheet.typeLabel')}
            options={ITEM_TYPE_OPTIONS}
          />
        )}
      </form.AppField>
      <form.AppField name="cost">
        {(field) => <field.Number label={t('shop.createSheet.costLabel')} />}
      </form.AppField>
      <form.AppField name="currency">
        {(field) => (
          <field.Select
            label={t('shop.createSheet.currencyLabel')}
            options={CURRENCY_OPTIONS}
          />
        )}
      </form.AppField>
      <form.AppField name="value">
        {(field) => (
          <field.TextArea label={t('shop.createSheet.valueJsonLabel')} />
        )}
      </form.AppField>
      <form.AppField name="isActive">
        {(field) => (
          <field.Toggle
            label={t('shop.createSheet.statusLabel')}
            options={[
              t('shop.createSheet.statusActive'),
              t('shop.createSheet.statusInactive'),
            ]}
          />
        )}
      </form.AppField>
      {jsonError && <p className="text-xs text-destructive">{jsonError}</p>}
      <Button type="submit" className="w-full">
        {t('shop.createSheet.submit')}
      </Button>
    </form>
  )
}
