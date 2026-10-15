// Aperçu des toasts en local. Route publique pour se passer du back ; hors dev
// elle répond 404.
import { createFileRoute, notFound } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { Button } from '../components/ui/button.tsx'
import { ToastAction } from '../components/ui/toast.tsx'
import { TOAST_SEVERITY, type ToastSeverity } from '../constants/ui.constant.ts'
import { useToast } from '../hooks/useToast.ts'

export const Route = createFileRoute('/dev-toasts')({
  beforeLoad: () => {
    if (!import.meta.env.DEV) {
      throw notFound()
    }
  },
  component: DevToasts,
})

const SAMPLE_MESSAGE =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod.'

function DevToasts() {
  const { t } = useTranslation('common')
  const { toast } = useToast()
  const severities = Object.values(TOAST_SEVERITY) as ToastSeverity[]

  const show = (severity: ToastSeverity) =>
    toast({ title: `Toast ${severity}`, message: SAMPLE_MESSAGE, severity })

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 p-8">
      <h1 className="font-display text-2xl font-extrabold">Toasts</h1>
      <div className="flex flex-wrap gap-2">
        {severities.map((severity) => (
          <Button
            key={severity}
            variant="outline"
            onClick={() => show(severity)}
          >
            {severity}
          </Button>
        ))}
        <Button
          variant="outline"
          onClick={() => toast({ title: 'Lorem ipsum' })}
        >
          Title only
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            toast({
              title: t('newVersion.title'),
              message: t('newVersion.message'),
              severity: TOAST_SEVERITY.INFO,
              action: (
                <ToastAction altText={t('newVersion.action')}>
                  {t('newVersion.action')}
                </ToastAction>
              ),
            })
          }
        >
          With action
        </Button>
        <Button onClick={() => severities.forEach(show)}>Show all</Button>
      </div>
    </div>
  )
}
