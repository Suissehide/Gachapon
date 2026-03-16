import { createFileRoute, Link, useNavigate, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { api } from '../lib/api.js'
import { useAuthStore } from '../stores/auth.store.js'
import type { AuthUser } from '../stores/auth.store.js'

export const Route = createFileRoute('/login')({
  beforeLoad: () => {
    if (useAuthStore.getState().isAuthenticated) {
      throw redirect({ to: '/play' })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const setUser = useAuthStore(s => s.setUser)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const user = await api.post<AuthUser>('/auth/login', { email, password })
      setUser(user)
      void navigate({ to: '/play' })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-md rounded-2xl bg-gray-900 p-8 shadow-xl">
        <h1 className="mb-2 text-center text-3xl font-bold text-white">Gachapon</h1>
        <p className="mb-8 text-center text-gray-400">Connecte-toi pour jouer</p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-900/40 p-3 text-sm text-red-300">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full rounded-lg bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="w-full rounded-lg bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-purple-600 py-3 font-semibold text-white transition hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <div className="mt-6 flex flex-col gap-3">
          <a
            href="/auth/oauth/google/authorize"
            className="flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 font-medium text-gray-900 hover:bg-gray-100"
          >
            Continuer avec Google
          </a>
          <a
            href="/auth/oauth/discord/authorize"
            className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 font-medium text-white hover:bg-indigo-700"
          >
            Continuer avec Discord
          </a>
        </div>

        <p className="mt-6 text-center text-sm text-gray-400">
          Pas encore de compte ?{' '}
          <Link to="/register" className="text-purple-400 hover:underline">S'inscrire</Link>
        </p>
      </div>
    </div>
  )
}
