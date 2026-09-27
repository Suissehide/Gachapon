import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

import { AchievementUnlockToast } from '../components/achievements/AchievementUnlockToast.tsx'
import { AuthDialog } from '../components/auth/authDialog.tsx'
import { Navbar } from '../components/custom/Navbar.tsx'
import { GuestSaveBanner } from '../components/guest/GuestSaveBanner.tsx'
import { GuestSaveDialog } from '../components/guest/GuestSaveDialog.tsx'
import { LevelUpOverlay } from '../components/level/LevelUpOverlay.tsx'
import { RewardRevealOverlay } from '../components/rewards/RewardRevealOverlay.tsx'
import { useAuthStore } from '../stores/auth.store.js'
import { useAuthDialogStore } from '../stores/authDialog.store.ts'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthenticated) {
      throw redirect({ to: '/' })
    }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  const authDialogOpen = useAuthDialogStore((s) => s.open)
  const authDialogTab = useAuthDialogStore((s) => s.tab)
  const setAuthDialogOpen = useAuthDialogStore((s) => s.setOpen)
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-[var(--topbar-h)]">
        <GuestSaveBanner />
        <Outlet />
      </main>
      <LevelUpOverlay />
      <AchievementUnlockToast />
      <RewardRevealOverlay />
      <GuestSaveDialog />
      {/* « Se connecter à ce compte » depuis la conversion d'un invité : la
          popup de connexion n'était montée que sur les pages publiques. */}
      <AuthDialog
        open={authDialogOpen}
        onOpenChange={setAuthDialogOpen}
        defaultTab={authDialogTab}
      />
    </div>
  )
}
