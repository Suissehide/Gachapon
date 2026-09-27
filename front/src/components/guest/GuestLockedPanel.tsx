import { useNavigate } from '@tanstack/react-router'
import { Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'

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
  const navigate = useNavigate()
  return (
    <Card className="mx-auto max-w-lg text-center">
      <CardHeader>
        <Lock className="mx-auto h-8 w-8 text-primary" />
        <CardTitle>{t(`locked.${feature}.title`)}</CardTitle>
        <CardDescription>{t(`locked.${feature}.description`)}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={() => void navigate({ to: '/settings' })}>
          {t('locked.cta')}
        </Button>
      </CardContent>
    </Card>
  )
}
