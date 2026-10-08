import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { ToastAction } from '../components/ui/toast.tsx'
import { TOAST_SEVERITY } from '../constants/ui.constant.ts'
import { useToast } from './useToast.ts'

const CHECK_INTERVAL_MS = 5 * 60 * 1000
const BUNDLE_PATTERN = /\/assets\/index-[\w-]+\.js/

/**
 * Le nom du bundle Vite change à chaque build : on compare celui de la page
 * chargée à celui de l'index.html servi maintenant. En dev, le script est
 * /src/main.tsx, aucun bundle n'est trouvé et la vérification ne tourne pas.
 */
export function useNewVersionCheck() {
  const { t } = useTranslation('common')
  const { toast } = useToast()

  useEffect(() => {
    const current = Array.from(document.scripts)
      .map((s) => s.src.match(BUNDLE_PATTERN)?.[0])
      .find(Boolean)
    if (!current) {
      return
    }

    let notified = false
    const check = async () => {
      if (notified || document.visibilityState !== 'visible') {
        return
      }
      try {
        const html = await fetch('/index.html', { cache: 'no-store' }).then(
          (r) => r.text(),
        )
        const latest = html.match(BUNDLE_PATTERN)?.[0]
        if (!latest || latest === current) {
          return
        }
        notified = true
        toast({
          title: t('newVersion.title'),
          message: t('newVersion.message'),
          severity: TOAST_SEVERITY.INFO,
          duration: Number.POSITIVE_INFINITY,
          action: (
            <ToastAction
              altText={t('newVersion.action')}
              onClick={() => window.location.reload()}
            >
              {t('newVersion.action')}
            </ToastAction>
          ),
        })
      } catch {
        // Hors ligne ou déploiement en cours : on réessaie au prochain tour.
      }
    }

    const interval = setInterval(check, CHECK_INTERVAL_MS)
    document.addEventListener('visibilitychange', check)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', check)
    }
  }, [t, toast])
}
