import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

import { Navbar } from '../components/custom/navbar.tsx'
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
      <main className="pt-16">
        <Outlet />
      </main>
    </div>
  )
}
