import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowLeft,
  Check,
  Copy,
  Eye,
  EyeOff,
  Key,
  Plus,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'

import { ConfirmPopup } from '../../components/team'
import { Button } from '../../components/ui/button.tsx'
import { Input } from '../../components/ui/input.tsx'
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
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string
    name: string
  } | null>(null)

  const handleCreate = () => {
    const name = newKeyName.trim()
    if (!name) {
      return
    }
    createKey(name, {
      onSuccess: (key) => {
        setCreatedKey(key)
        setVisible(true)
        setNewKeyName('')
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
        <div>
          <Link
            to="/profile/$username"
            params={{ username: user?.username ?? '' }}
            className="mb-4 flex w-fit items-center gap-1.5 text-sm text-text-light transition-colors hover:text-text"
          >
            <ArrowLeft className="h-4 w-4" />
            Mon profil
          </Link>
          <h1 className="text-2xl font-black text-text">Paramètres</h1>
        </div>

        {/* Infos compte */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-5 text-sm font-bold uppercase tracking-wide text-text-light">
            Compte
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-primary/30 to-secondary/30 text-xl font-black text-primary">
              {user?.username[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-text">@{user?.username}</p>
              <p className="text-sm text-text-light">{user?.email}</p>
            </div>
          </div>
        </section>

        {/* API Keys */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-text-light">
            Clés API
          </h2>
          <p className="mb-5 text-xs text-text-light">
            Utilisées pour accéder à l'API publique. La clé n'est affichée
            qu'une seule fois à la création.
          </p>

          {/* Formulaire création */}
          <div className="mb-5 flex gap-2">
            <Input
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { handleCreate() }
              }}
              placeholder="Nom de la clé (ex: bot-discord)"
              maxLength={50}
            />
            <Button onClick={handleCreate} disabled={creating || !newKeyName.trim()}>
              <Plus className="h-4 w-4" />
              Créer
            </Button>
          </div>

          {/* Nouvelle clé affichée une fois */}
          {createdKey && (
            <div className="mb-5 rounded-lg border border-primary/30 bg-primary/5 p-4">
              <p className="mb-3 text-xs font-semibold text-primary">
                ⚠️ Copiez cette clé maintenant — elle ne sera plus affichée.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 overflow-hidden text-ellipsis rounded bg-background px-2 py-1.5 font-mono text-xs text-text">
                  {visible ? createdKey.key : '•'.repeat(40)}
                </code>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setVisible((v) => !v)}
                  title={visible ? 'Masquer' : 'Afficher'}
                >
                  {visible ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleCopy}
                  title="Copier"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
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
                  <div className="min-w-0 flex-1">
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
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setDeleteTarget({ id: k.id, name: k.name })}
                    title="Supprimer"
                    className="text-text-light hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <ConfirmPopup
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null)
          }
        }}
        icon={<Trash2 className="h-4 w-4" />}
        title="Supprimer la clé"
        description={
          deleteTarget
            ? `Supprimer la clé "${deleteTarget.name}" ? Cette action est irréversible.`
            : ''
        }
        confirmLabel="Supprimer"
        onConfirm={() => {
          if (!deleteTarget) {
            return
          }
          deleteKey(deleteTarget.id, {
            onSuccess: () => {
              if (createdKey?.id === deleteTarget.id) {
                setCreatedKey(null)
              }
            },
          })
        }}
      />
    </div>
  )
}
