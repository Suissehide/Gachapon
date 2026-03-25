import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { Clock, Mail } from 'lucide-react'
import { useEffect, useState } from 'react'
import { z } from 'zod'

import { Button } from '../components/ui/button.tsx'
import { useResendVerification } from '../queries/useAuth.ts'
import { useAuthStore } from '../stores/auth.store.js'

export const Route = createFileRoute('/pending')({
  validateSearch: z.object({
    reason: z.enum(['email', 'admin']).optional(),
    email: z.string().optional(),
  }),
  beforeLoad: ({ search }) => {
    // email reason is accessible without auth (user is not yet logged in)
    if (search.reason === 'email') return
    if (!useAuthStore.getState().isAuthenticated) {
      throw redirect({ to: '/' })
    }
  },
  component: Pending,
})

function Pending() {
  const logout = useAuthStore((s) => s.logout)
  const { reason, email } = Route.useSearch()
  const isEmailReason = reason === 'email'
  const { mutate: resend, isPending: isResending } = useResendVerification()
  const [cooldown, setCooldown] = useState(0)
  const [resendSuccess, setResendSuccess] = useState(false)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setInterval(() => setCooldown((c) => c - 1), 1000)
    return () => clearInterval(t)
  }, [cooldown])

  const handleResend = () => {
    if (!email) return
    resend(email, {
      onSuccess: () => {
        setResendSuccess(true)
        setCooldown(120)
      },
      onError: () => {
        setCooldown(120)
      },
    })
  }

  return (
    <div className="relative overflow-hidden w-full h-screen flex items-center justify-center bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-15%] top-[-10%] h-[500px] w-[500px] rounded-full bg-primary/8 blur-[130px]" />
        <div className="absolute right-[-10%] bottom-[-5%] h-[400px] w-[400px] rounded-full bg-secondary/8 blur-[110px]" />
      </div>

      <div className="absolute top-6 left-6 z-10">
        <span className="text-2xl font-black bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
          Gachapon
        </span>
      </div>

      <div className="relative z-10 w-full max-w-[420px] mx-6 bg-card/60 flex flex-col px-10 py-10 rounded-2xl border border-border backdrop-blur-xl shadow-2xl shadow-black/30">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
          {isEmailReason
            ? <Mail className="h-6 w-6 text-primary" />
            : <Clock className="h-6 w-6 text-primary" />
          }
        </div>

        {isEmailReason ? (
          <>
            <h1 className="w-full text-2xl font-black mb-3 text-foreground">
              Confirme ton adresse
            </h1>
            <p className="mb-2 text-sm leading-relaxed text-text-light">
              Un lien de confirmation a été envoyé à{' '}
              {email && <strong className="text-text">{email}</strong>}.
              Clique dessus pour activer ton compte.
            </p>
            <p className="mb-6 text-xs text-text-light">
              Le lien est valable 24 heures. Vérifie aussi tes spams.
            </p>
            {resendSuccess && (
              <p className="mb-4 text-xs text-green-400">Email renvoyé !</p>
            )}
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="default"
                onClick={handleResend}
                disabled={isResending || cooldown > 0 || !email}
                className="w-fit"
              >
                {cooldown > 0
                  ? `Renvoyer (${cooldown}s)`
                  : isResending ? 'Envoi…' : "Renvoyer l'email"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <h1 className="w-full text-2xl font-black mb-3 text-foreground">
              Compte en attente
            </h1>
            <p className="mb-8 text-sm leading-relaxed text-text-light">
              Votre compte a été créé mais n'a pas encore été activé. Veuillez
              contacter un administrateur pour obtenir l'accès au reste du site.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => void logout()}
              className="w-fit"
            >
              Se déconnecter
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

export default Pending
