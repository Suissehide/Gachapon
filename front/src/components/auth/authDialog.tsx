import { X } from 'lucide-react'
import { Dialog } from 'radix-ui'
import { useEffect, useState } from 'react'

import { Button } from '../ui/button.tsx'
import { LoginForm } from './loginForm.tsx'
import { RegisterForm } from './registerForm.tsx'

export type AuthTab = 'login' | 'register'

export function AuthDialog({
  open,
  onOpenChange,
  defaultTab = 'login',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultTab?: AuthTab
}) {
  const [tab, setTab] = useState<AuthTab>(defaultTab)

  useEffect(() => {
    if (open) setTab(defaultTab)
  }, [open, defaultTab])

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card shadow-2xl shadow-black/20 overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-200">
          {/* Header */}
          <div className="px-8 pt-7 pb-0">
            <Dialog.Close asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="absolute right-4 top-4 rounded-full text-text-light hover:text-text"
              >
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>

            <p className="text-[11px] font-black tracking-[0.15em] text-primary uppercase mb-3">
              Gachapon
            </p>
            <Dialog.Title className="text-xl font-black text-foreground">
              {tab === 'login' ? 'Bon retour' : 'Créer un compte'}
            </Dialog.Title>
            <Dialog.Description className="text-sm text-text-light mt-1">
              {tab === 'login'
                ? 'Connecte-toi pour reprendre ta collection.'
                : 'Rejoins des milliers de collectionneurs.'}
            </Dialog.Description>

            {/* Tabs */}
            <div className="flex border-b border-border mt-5">
              {(['login', 'register'] as AuthTab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`flex-1 pb-3 text-sm font-semibold transition-colors relative ${
                    tab === t
                      ? 'text-foreground'
                      : 'text-text-light hover:text-text'
                  }`}
                >
                  {t === 'login' ? 'Se connecter' : "S'inscrire"}
                  {tab === t && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <div className="px-8 py-6">
            {tab === 'login' ? (
              <LoginForm onSuccess={() => onOpenChange(false)} />
            ) : (
              <RegisterForm onSuccess={() => onOpenChange(false)} />
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
