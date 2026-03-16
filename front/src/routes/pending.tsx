import { createFileRoute, redirect } from '@tanstack/react-router'
import { Lock } from 'lucide-react'

import { useAuthStore } from '../stores/auth.store.js'

export const Route = createFileRoute('/pending')({
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
  component: Pending,
})

function Pending() {
  const logout = useAuthStore(s => s.logout)

  return (
    <div className="overflow-hidden w-full h-screen flex relative bg-gray-950 text-white">
      <div className="absolute top-6 left-2">
        <h1 className="px-2 text-3xl font-bold text-purple-400">Gachapon</h1>
      </div>

      <div className="flex-1 flex justify-end">
        <div className="z-10 w-[450px] top-1/2 -translate-y-1/2 bg-gray-900/45 flex flex-col px-12 py-8 rounded-2xl border border-gray-700 backdrop-blur-sm absolute right-8">
          <div className="mb-6 flex justify-start">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="w-full text-2xl font-bold mb-6">
            Compte en attente d'approbation
          </h1>
          <p className="mb-6 text-gray-400">
            Votre compte a été créé mais n'a pas encore été activé. Veuillez
            contacter un administrateur pour obtenir l'accès au reste du site.
          </p>
          <div className="flex">
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-lg bg-purple-600 px-6 py-2 font-semibold text-white hover:bg-purple-700"
            >
              Se déconnecter
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Pending
