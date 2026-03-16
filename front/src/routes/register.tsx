import { createFileRoute, Link, useNavigate, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { api } from '../lib/api.js'
import { useAuthStore } from '../stores/auth.store.js'
import type { AuthUser } from '../stores/auth.store.js'

export const Route = createFileRoute('/register')({
  beforeLoad: () => {
    if (useAuthStore.getState().isAuthenticated) {
      throw redirect({ to: '/play' })
    }
  },
  component: RegisterPage,
})

function RegisterPage() {
  const [username, setUsername] = useState('')
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
      const user = await api.post<AuthUser>('/auth/register', { username, email, password })
      setUser(user)
      void navigate({ to: '/play' })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'inscription")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-md rounded-2xl bg-gray-900 p-8 shadow-xl">
        <h1 className="mb-2 text-center text-3xl font-bold text-white">Gachapon</h1>
        <p className="mb-8 text-center text-gray-400">Crée ton compte</p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-900/40 p-3 text-sm text-red-300">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Pseudo (lettres, chiffres, _)"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            minLength={3}
            maxLength={30}
            pattern="[a-zA-Z0-9_]+"
            className="w-full rounded-lg bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
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
            placeholder="Mot de passe (8 caractères min)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full rounded-lg bg-gray-800 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-purple-600 py-3 font-semibold text-white transition hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? 'Création…' : 'Créer mon compte'}
          </button>
        </form>

        <div className="mt-6 flex flex-col gap-3">
          <a
            href="/auth/oauth/google/authorize"
            className="flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 font-medium text-gray-900 hover:bg-gray-100"
          >
            S'inscrire avec Google
          </a>
          <a
            href="/auth/oauth/discord/authorize"
            className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 font-medium text-white hover:bg-indigo-700"
          >
            S'inscrire avec Discord
          </a>
        </div>

        <p className="mt-6 text-center text-sm text-gray-400">
          Déjà un compte ?{' '}
          <Link to="/login" className="text-purple-400 hover:underline">Se connecter</Link>
        </p>
      </div>
    </div>
  )
}
