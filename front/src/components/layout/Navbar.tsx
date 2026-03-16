import { Link } from '@tanstack/react-router'
import { useAuthStore } from '../../stores/auth.store.js'

export function Navbar() {
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-gray-800 bg-gray-900/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link to="/play" className="text-xl font-bold text-purple-400">🎰 Gachapon</Link>

        <div className="hidden items-center gap-6 md:flex">
          <Link to="/play" className="text-sm text-gray-300 hover:text-white [&.active]:text-purple-400">Jouer</Link>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Link to={'/collection' as any} className="text-sm text-gray-300 hover:text-white [&.active]:text-purple-400">Collection</Link>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Link to={'/teams' as any} className="text-sm text-gray-300 hover:text-white [&.active]:text-purple-400">Équipes</Link>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Link to={'/shop' as any} className="text-sm text-gray-300 hover:text-white [&.active]:text-purple-400">Boutique</Link>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Link to={'/leaderboard' as any} className="text-sm text-gray-300 hover:text-white [&.active]:text-purple-400">Classement</Link>
        </div>

        <div className="flex items-center gap-4">
          {user && (
            <span className="rounded-full bg-purple-900/50 px-3 py-1 text-sm font-medium text-purple-300">
              🎟️ {user.tokens}
            </span>
          )}
          {user && (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            <Link
              to={'/profile/$username' as any}
              params={{ username: user.username } as any}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-600 text-sm font-bold text-white"
            >
              {user.username[0]?.toUpperCase()}
            </Link>
          )}
          {user && (
            <button
              onClick={() => void logout()}
              className="text-sm text-gray-400 hover:text-white"
            >
              Déconnexion
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}
