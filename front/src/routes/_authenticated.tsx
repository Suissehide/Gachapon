import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

import { AchievementUnlockToast } from '../components/achievements/AchievementUnlockToast.tsx'
import { Navbar } from '../components/custom/Navbar.tsx'
import { LevelUpOverlay } from '../components/level/LevelUpOverlay.tsx'
import { RewardRevealOverlay } from '../components/rewards/RewardRevealOverlay.tsx'
import { useAuthStore } from '../stores/auth.store.js'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthenticated) {
      throw redirect({ to: '/' })
    }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-[var(--topbar-h)]">
        <Outlet />
      </main>
      <LevelUpOverlay />
      <AchievementUnlockToast />
      <RewardRevealOverlay />
    </div>
  )
}
