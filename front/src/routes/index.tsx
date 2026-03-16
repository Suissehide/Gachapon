import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useAuthStore } from '../stores/auth.store.js'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    if (useAuthStore.getState().isAuthenticated) {
      throw redirect({ to: '/play' })
    }
  },
  component: LandingPage,
})

function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 px-4 text-white">
      <h1 className="mb-4 text-6xl font-extrabold text-purple-400">🎰 Gachapon</h1>
      <p className="mb-10 max-w-xl text-center text-xl text-gray-300">
        Joue à la machine à pince 3D, construis ta collection et rivalise avec tes équipes.
      </p>
      <div className="mb-16 flex gap-4">
        <Link to="/register" className="rounded-xl bg-purple-600 px-8 py-4 text-lg font-semibold hover:bg-purple-700">
          Commencer à jouer
        </Link>
        <Link to="/login" className="rounded-xl border border-gray-700 px-8 py-4 text-lg font-semibold hover:bg-gray-800">
          Se connecter
        </Link>
      </div>
      <div className="grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3">
        {[
          { icon: '🎰', title: 'Machine à pince 3D', desc: 'Attrape des boules mystères avec une vraie machine en 3D.' },
          { icon: '✨', title: 'Raretés & variantes', desc: 'Commun, Rare, Épique, Légendaire… et des cartes Holographiques.' },
          { icon: '👥', title: 'Équipes', desc: 'Rejoins des équipes, partage ta collection, rivalise au classement.' },
        ].map(({ icon, title, desc }) => (
          <div key={title} className="rounded-xl bg-gray-900 p-6">
            <div className="mb-3 text-4xl">{icon}</div>
            <h3 className="mb-2 font-bold">{title}</h3>
            <p className="text-sm text-gray-400">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
