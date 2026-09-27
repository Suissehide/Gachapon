import { X } from 'lucide-react'
import { Dialog } from 'radix-ui'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useGuestRename } from '../../queries/useGuest.ts'
import { useAuthStore, useIsGuest } from '../../stores/auth.store.ts'
import { useGuestSaveDialogStore } from '../../stores/guestSaveDialog.store.ts'
import { Button } from '../ui/button.tsx'
import { Input } from '../ui/input.tsx'
import { Label } from '../ui/label.tsx'
import { GuestAccountCard } from './GuestAccountCard.tsx'

// Même règle que l'édition du pseudo sur le profil (ArcadeHero).
const USERNAME_RE = /^[a-zA-Z0-9_]{3,30}$/

/**
 * Popup « Sauvegarder ma progression » d'un invité, calquée sur la popup de
 * connexion : choix du pseudo, puis email + mot de passe ou Google/Discord.
 * Ouverte par la bannière, les panneaux verrouillés et « Créer un compte ».
 */
export function GuestSaveDialog() {
  const { t } = useTranslation('guest')
  const open = useGuestSaveDialogStore((s) => s.open)
  const setOpen = useGuestSaveDialogStore((s) => s.setOpen)
  const isGuest = useIsGuest()

  // Conversion terminée (liaison OAuth, ou vérification dans un autre onglet) :
  // la popup n'a plus d'objet.
  useEffect(() => {
    if (open && !isGuest) {
      setOpen(false)
    }
  }, [open, isGuest, setOpen])

  return (
    <Dialog.Root open={open && isGuest} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[480px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl shadow-black/20 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-200">
          <div className="px-8 pt-7">
            <Dialog.Close asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="absolute right-4 top-4 rounded-full text-text-light hover:text-text"
                aria-label={t('saveDialog.close')}
              >
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>

            <p className="mb-3 text-[11px] font-black uppercase tracking-[0.15em] text-primary">
              Gachapon
            </p>
            <Dialog.Title className="text-xl font-black text-foreground">
              {t('saveDialog.title')}
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-sm text-text-light">
              {t('saveDialog.description')}
            </Dialog.Description>
          </div>

          <div className="flex flex-col gap-6 px-8 py-6">
            <UsernameField />
            <GuestAccountCard
              hideHeader
              onLoginInstead={() => setOpen(false)}
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function UsernameField() {
  const { t } = useTranslation('guest')
  const username = useAuthStore((s) => s.user?.username ?? '')
  const [draft, setDraft] = useState(username)
  const rename = useGuestRename()

  // Resynchronise le brouillon quand le pseudo change (sauvegarde réussie).
  useEffect(() => {
    setDraft(username)
  }, [username])

  const trimmed = draft.trim()
  const valid = USERNAME_RE.test(trimmed)
  const dirty = trimmed !== username

  const save = () => {
    if (valid && dirty) {
      rename.mutate(trimmed)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="guest-save-username">
        {t('saveDialog.usernameLabel')}
      </Label>
      <div className="flex gap-2">
        <Input
          id="guest-save-username"
          value={draft}
          maxLength={30}
          autoComplete="off"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              save()
            }
          }}
        />
        <Button
          variant="outline"
          onClick={save}
          disabled={!valid || !dirty || rename.isPending}
        >
          {t('saveDialog.usernameSave')}
        </Button>
      </div>
      <p className="text-xs text-text-light">
        {dirty && !valid
          ? t('saveDialog.usernameInvalid')
          : t('saveDialog.usernameHint')}
      </p>
    </div>
  )
}
