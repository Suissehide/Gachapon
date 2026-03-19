import { createFileRoute, redirect } from '@tanstack/react-router'
import { Clock } from 'lucide-react'

import { Button } from '../components/ui/button.tsx'
import { useAuthStore } from '../stores/auth.store.js'

export const Route = createFileRoute('/pending')({
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthenticated) {
      throw redirect({ to: '/' })
    }
  },
  component: Pending,
})

function Pending() {
  const logout = useAuthStore((s) => s.logout)

  return (
    <div className="relative overflow-hidden w-full h-screen flex items-center justify-center bg-background text-foreground">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-15%] top-[-10%] h-[500px] w-[500px] rounded-full bg-primary/8 blur-[130px]" />
        <div className="absolute right-[-10%] bottom-[-5%] h-[400px] w-[400px] rounded-full bg-secondary/8 blur-[110px]" />
      </div>

      {/* Logo */}
      <div className="absolute top-6 left-6 z-10">
        <span className="text-2xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Gachapon
        </span>
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-[420px] mx-6 bg-card/60 flex flex-col px-10 py-10 rounded-2xl border border-border backdrop-blur-xl shadow-2xl shadow-black/30">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
          <Clock className="h-6 w-6 text-primary" />
        </div>

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
      </div>
    </div>
  )
}

export default Pending
