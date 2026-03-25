import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

import { LandingNavbar } from '../components/custom/LandingNavbar.tsx'
import { Button } from '../components/ui/button.tsx'
import { useForgotPassword } from '../queries/useAuth.ts'

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const { mutate: forgotPassword, isPending, error } = useForgotPassword()
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
              <h1 className="mb-3 text-2xl font-black text-text">Email envoyé</h1>
              <p className="text-sm text-text-light">
                Si cette adresse est associée à un compte, tu recevras un email avec un lien de réinitialisation.
              </p>
            </div>
          ) : (
            <>
              <h1 className="mb-2 text-2xl font-black text-text">Mot de passe oublié</h1>
              <p className="mb-6 text-sm text-text-light">
                Saisis ton adresse email pour recevoir un lien de réinitialisation.
              </p>
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ton@email.com"
                  required
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-text placeholder:text-text-light focus:border-primary focus:outline-none"
                />
                {error && <p className="text-xs text-destructive">{error.message}</p>}
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? 'Envoi…' : 'Envoyer le lien'}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
