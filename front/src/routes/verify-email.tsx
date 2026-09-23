import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { CheckCircle, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import { LandingNavbar } from '../components/custom/LandingNavbar.tsx'
import { useVerifyEmail } from '../queries/useAuth.ts'
import { useAuthStore } from '../stores/auth.store.ts'

export const Route = createFileRoute('/verify-email')({
  validateSearch: z.object({ token: z.string().optional() }),
  component: VerifyEmailPage,
})

function VerifyEmailPage() {
  const { t } = useTranslation('auth')
  const { token } = Route.useSearch()
  const navigate = useNavigate()
  const fetchMe = useAuthStore((s) => s.fetchMe)
  const { mutate: verifyEmail } = useVerifyEmail()
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  // Ne doit s'exécuter qu'au montage : token vient de l'URL et ne change pas
  // pendant la vie de la page. Dépendances omises, une par une :
  // - fetchMe (store Zustand), verifyEmail (mutation React Query), navigate
  //   (routeur) : références stables entre rendus, préexistant à cette tâche.
  // - t (react-i18next, AJOUTÉ par la tâche 11b) : sûr ici précisément parce
  //   que useLocale().switchTo fait une navigation dure sur tout changement
  //   de langue (window.location.assign, voir src/i18n/useLocale.ts:34-45) —
  //   ce composant est donc toujours démonté avant qu'un `t` d'une autre
  //   langue puisse exister. Ne pas copier ce biome-ignore vers un effet où
  //   `t` serait une dépendance réellement variable.
  // biome-ignore lint/correctness/useExhaustiveDependencies: fetchMe/verifyEmail/navigate/t sont des références stables (voir ci-dessus) ; effet volontairement au montage seul
  useEffect(() => {
    if (!token) {
      setState('error')
      setErrorMsg(t('verifyEmail.noTokenError'))
      return
    }
    verifyEmail(token, {
      onSuccess: async () => {
        await fetchMe()
        setState('success')
        setTimeout(() => void navigate({ to: '/play' }), 3000)
      },
      onError: (err) => {
        setState('error')
        setErrorMsg(err.message)
      },
    })
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNavbar />
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          {state === 'loading' && (
            <>
              <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-text-light">{t('verifyEmail.verifying')}</p>
            </>
          )}
          {state === 'success' && (
            <>
              <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-400" />
              <h1 className="mb-2 text-2xl font-black text-text">
                {t('verifyEmail.success.title')}
              </h1>
              <p className="text-text-light">
                {t('verifyEmail.success.redirecting')}
              </p>
            </>
          )}
          {state === 'error' && (
            <>
              <XCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
              <h1 className="mb-2 text-2xl font-black text-text">
                {t('verifyEmail.error.title')}
              </h1>
              <p className="text-text-light">{errorMsg}</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
