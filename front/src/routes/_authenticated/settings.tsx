import { createFileRoute } from '@tanstack/react-router'
import dayjs from 'dayjs'
import { Check, Copy, Eye, EyeOff, Key, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { PageHeader } from '../../components/shared/PageHeader'
import { PageShell } from '../../components/shared/PageShell'
import { ConfirmPopup } from '../../components/team/ConfirmPopup.tsx'
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
  const { t } = useTranslation(['settings', 'collection'])
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
    <PageShell>
      <PageHeader
        breadcrumbs={[
          { label: 'Gachapon', to: '/play' },
          {
            label: t('collection:page.breadcrumbProfile'),
            to: '/profile/$username',
            params: { username: user?.username ?? '' },
          },
          { label: t('settings:breadcrumb') },
        ]}
        title={t('settings:title')}
      />

      {/* Infos compte */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-5 text-sm font-bold uppercase tracking-wide text-text-light">
          {t('settings:account.heading')}
        </h2>
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-primary/30 to-secondary/30 text-xl font-black text-primary">
            {user?.username[0]?.toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-text">{user?.username}</p>
            <p className="text-sm text-text-light">{user?.email}</p>
          </div>
        </div>
      </section>

      {/* API Keys */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-text-light">
          {t('settings:apiKeys.heading')}
        </h2>
        <p className="mb-5 text-xs text-text-light">
          {t('settings:apiKeys.description')}
        </p>

        {/* Formulaire création */}
        <div className="mb-5 flex gap-2">
          <Input
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCreate()
              }
            }}
            placeholder={t('settings:apiKeys.namePlaceholder')}
            maxLength={50}
          />
          <Button
            onClick={handleCreate}
            disabled={creating || !newKeyName.trim()}
          >
            <Plus className="h-4 w-4" />
            {t('settings:apiKeys.create')}
          </Button>
        </div>

        {/* Nouvelle clé affichée une fois */}
        {createdKey && (
          <div className="mb-5 rounded-lg border border-primary/30 bg-primary/5 p-4">
            <p className="mb-3 text-xs font-semibold text-primary">
              {t('settings:apiKeys.newKeyWarning')}
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 overflow-hidden text-ellipsis rounded bg-background px-2 py-1.5 font-mono text-xs text-text">
                {visible ? createdKey.key : '•'.repeat(40)}
              </code>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setVisible((v) => !v)}
                title={
                  visible
                    ? t('settings:apiKeys.hide')
                    : t('settings:apiKeys.show')
                }
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
                title={t('settings:apiKeys.copy')}
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
          <p className="text-xs text-text-light">
            {t('settings:apiKeys.loading')}
          </p>
        ) : apiKeys?.length === 0 ? (
          <p className="text-xs text-text-light">
            {t('settings:apiKeys.empty')}
          </p>
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
                    {t('settings:apiKeys.createdOn', {
                      date: dayjs(k.createdAt).format('L'),
                    })}
                    {k.lastUsedAt &&
                      t('settings:apiKeys.usedOn', {
                        date: dayjs(k.lastUsedAt).format('L'),
                      })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setDeleteTarget({ id: k.id, name: k.name })}
                  title={t('settings:apiKeys.delete')}
                  className="text-text-light hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmPopup
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null)
          }
        }}
        icon={<Trash2 className="h-4 w-4" />}
        title={t('settings:apiKeys.deletePopup.title')}
        description={
          deleteTarget
            ? t('settings:apiKeys.deletePopup.description', {
                name: deleteTarget.name,
              })
            : ''
        }
        confirmLabel={t('settings:apiKeys.deletePopup.confirm')}
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
    </PageShell>
  )
}
