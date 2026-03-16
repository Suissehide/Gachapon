import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { useAuthStore } from '../stores/auth.store.js'
import { Navbar } from '../components/layout/Navbar.js'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />
      <main className="pt-16">
        <Outlet />
      </main>
    </div>
  )
}
