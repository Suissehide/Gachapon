import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import { LandingNavbar } from '../components/custom/LandingNavbar.tsx'
import { Button } from '../components/ui/button.tsx'
import { useResetPassword } from '../queries/useAuth.ts'

export const Route = createFileRoute('/reset-password')({
  validateSearch: z.object({ token: z.string().optional() }),
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const { t } = useTranslation('auth')
  const { token } = Route.useSearch()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [done, setDone] = useState(false)
  const [validationError, setValidationError] = useState('')
  const { mutate: resetPassword, isPending, error } = useResetPassword()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError('')
    if (password !== confirm) {
      setValidationError(t('resetPassword.validation.passwordMismatch'))
      return
    }
    if (!token) {
      setValidationError(t('resetPassword.validation.missingToken'))
      return
    }
    resetPassword(
      { token, newPassword: password },
      { onSuccess: () => setDone(true) },
    )
  }

  if (done) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <LandingNavbar />
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
          <div className="text-center">
            <h1 className="mb-3 text-2xl font-black text-text">
              {t('resetPassword.success.title')}
            </h1>
            <p className="mb-6 text-sm text-text-light">
              {t('resetPassword.success.description')}
            </p>
            <Button onClick={() => void navigate({ to: '/' })}>
              {t('resetPassword.success.backHomeButton')}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNavbar />
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <h1 className="mb-2 text-2xl font-black text-text">
            {t('resetPassword.form.title')}
          </h1>
          <p className="mb-6 text-sm text-text-light">
            {t('resetPassword.form.description')}
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('resetPassword.form.newPasswordPlaceholder')}
              minLength={8}
              required
              className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-text placeholder:text-text-light focus:border-primary focus:outline-none"
            />
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={t('resetPassword.form.confirmPasswordPlaceholder')}
              required
              className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-text placeholder:text-text-light focus:border-primary focus:outline-none"
            />
            {(validationError || error) && (
              <p className="text-xs text-destructive">
                {validationError || error?.message}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending
                ? t('resetPassword.form.submitPending')
                : t('resetPassword.form.submit')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
