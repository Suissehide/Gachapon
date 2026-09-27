import { Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useGuestSaveDialogStore } from '../../stores/guestSaveDialog.store.ts'
import { Button } from '../ui/button.tsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card.tsx'

type Feature = 'teams' | 'raid' | 'wagers'

export function GuestLockedPanel({ feature }: { feature: Feature }) {
  const { t } = useTranslation('guest')
  const openSaveDialog = useGuestSaveDialogStore((s) => s.setOpen)
  return (
    <Card className="mx-auto max-w-lg text-center">
      <CardHeader>
        <Lock className="mx-auto h-8 w-8 text-primary" />
        <CardTitle>{t(`locked.${feature}.title`)}</CardTitle>
        <CardDescription>{t(`locked.${feature}.description`)}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={() => openSaveDialog(true)}>{t('locked.cta')}</Button>
      </CardContent>
    </Card>
  )
}
