import { createFileRoute } from '@tanstack/react-router'
import { Check, Copy, Eye, EyeOff, Key, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import type { ApiKeyCreated } from '../../queries/useProfile'
import {
  useApiKeys,
  useCreateApiKey,
  useDeleteApiKey,
} from '../../queries/useProfile'
import { useAuthStore } from '../../stores/auth.store'

export const Route = createFileRoute('/_authenticated/settings')({
  component: Settings,
})

function Settings() {
  const user = useAuthStore((s) => s.user)
  const { data: apiKeys, isLoading } = useApiKeys()
  const { mutate: createKey, isPending: creating } = useCreateApiKey()
  const { mutate: deleteKey } = useDeleteApiKey()

  const [newKeyName, setNewKeyName] = useState('')
  const [createdKey, setCreatedKey] = useState<ApiKeyCreated | null>(null)
  const [visible, setVisible] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCreate = () => {
    const name = newKeyName.trim()
    if (!name) {
      return
    }
    createKey(name, {
      onSuccess: (key) => {
        setCreatedKey(key)
        setNewKeyName('')
        setVisible(true)
      },
    })
  }

  const handleCopy = () => {
    if (!createdKey) {
      return
    }
    void navigator.clipboard.writeText(createdKey.key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <h1 className="text-2xl font-black text-text">Paramètres</h1>

        {/* Infos compte */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-sm font-bold text-text-light uppercase tracking-wide">
            Compte
          </h2>
          <div className="space-y-3">
            <InfoRow label="Pseudo" value={`@${user?.username}`} />
            <InfoRow label="Email" value={user?.email ?? '—'} />
            <InfoRow label="Rôle" value={user?.role ?? '—'} />
          </div>
        </section>

        {/* API Keys */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-1 text-sm font-bold text-text-light uppercase tracking-wide">
            Clés API
          </h2>
          <p className="mb-4 text-xs text-text-light">
            Utilisées pour accéder à l'API publique. La clé n'est affichée
            qu'une seule fois à la création.
          </p>

          {/* Formulaire création */}
          <div className="mb-6 flex gap-2">
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Nom de la clé (ex: bot-discord)"
              maxLength={50}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder-text-light focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating || !newKeyName.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-primary/80 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Créer
            </button>
          </div>

          {/* Nouvelle clé affichée une fois */}
          {createdKey && (
            <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
              <p className="mb-2 text-xs font-semibold text-primary">
                ⚠️ Copiez cette clé maintenant — elle ne sera plus affichée.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 overflow-hidden text-ellipsis rounded bg-background px-2 py-1.5 font-mono text-xs text-text">
                  {visible ? createdKey.key : '•'.repeat(40)}
                </code>
                <button
                  type="button"
                  onClick={() => setVisible((v) => !v)}
                  className="rounded p-1.5 text-text-light hover:text-text transition-colors"
                  title={visible ? 'Masquer' : 'Afficher'}
                >
                  {visible ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="rounded p-1.5 text-text-light hover:text-primary transition-colors"
                  title="Copier"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Liste des clés */}
          {isLoading ? (
            <p className="text-xs text-text-light">Chargement…</p>
          ) : apiKeys?.length === 0 ? (
            <p className="text-xs text-text-light">Aucune clé API créée.</p>
          ) : (
            <ul className="space-y-2">
              {apiKeys?.map((k) => (
                <li
                  key={k.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2"
                >
                  <Key className="h-4 w-4 shrink-0 text-text-light" />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-text">
                      {k.name}
                    </p>
                    <p className="text-xs text-text-light">
                      Créée le{' '}
                      {new Date(k.createdAt).toLocaleDateString('fr-FR')}
                      {k.lastUsedAt &&
                        ` · Utilisée le ${new Date(k.lastUsedAt).toLocaleDateString('fr-FR')}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteKey(k.id)}
                    className="rounded p-1.5 text-text-light hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-background px-3 py-2">
      <span className="text-xs text-text-light">{label}</span>
      <span className="text-sm font-medium text-text">{value}</span>
    </div>
  )
}
