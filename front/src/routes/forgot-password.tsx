import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { LandingNavbar } from '../components/custom/LandingNavbar.tsx'
import { Button } from '../components/ui/button.tsx'
import { useForgotPassword } from '../queries/useAuth.ts'
import { useAuthDialogStore } from '../stores/authDialog.store.ts'

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const { t } = useTranslation('auth')
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const { mutate: forgotPassword, isPending, error } = useForgotPassword()
  const navigate = useNavigate()
  const openLogin = useAuthDialogStore((s) => s.openLogin)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    forgotPassword(email, { onSuccess: () => setSent(true) })
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNavbar />
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
        <div className="w-full max-w-sm">
          {sent ? (
            <div className="text-center">
              <h1 className="mb-3 text-2xl font-black text-text">
                {t('forgotPassword.sent.title')}
              </h1>
              <p className="text-sm text-text-light">
                {t('forgotPassword.sent.description')}
              </p>
              <div className="mt-6 flex gap-3 justify-center">
                <Button variant="outline" onClick={() => navigate({ to: '/' })}>
                  {t('forgotPassword.sent.backButton')}
                </Button>
                <Button
                  onClick={() => {
                    navigate({ to: '/' })
                    openLogin()
                  }}
                >
                  {t('forgotPassword.sent.loginButton')}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="mb-2 text-2xl font-black text-text">
                {t('forgotPassword.form.title')}
              </h1>
              <p className="mb-6 text-sm text-text-light">
                {t('forgotPassword.form.description')}
              </p>
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('forgotPassword.form.emailPlaceholder')}
                  required
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-text placeholder:text-text-light focus:border-primary focus:outline-none"
                />
                {error && (
                  <p className="text-xs text-destructive">{error.message}</p>
                )}
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending
                    ? t('forgotPassword.form.submitPending')
                    : t('forgotPassword.form.submit')}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
