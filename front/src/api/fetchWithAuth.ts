import { useAuthStore } from '../stores/auth.store.ts'
import { AuthApi } from './auth.api.ts'

// A single in-flight refresh promise shared by every concurrent 401 retry.
// Cleared in `.finally()` so the next 401 starts a fresh attempt.
let inFlightRefresh: Promise<boolean> | null = null

function ensureFreshSession(): Promise<boolean> {
  if (!inFlightRefresh) {
    inFlightRefresh = AuthApi.refresh()
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        inFlightRefresh = null
      })
  }
  return inFlightRefresh
}

export const fetchWithAuth = async (
  input: RequestInfo,
  init?: RequestInit,
): Promise<Response> => {
  const makeRequest = () =>
    fetch(input, {
      ...init,
      credentials: 'include',
    })

  let response = await makeRequest()

  if (response.status === 401) {
    const refreshed = await ensureFreshSession()
    if (!refreshed) {
      // Clear the cached "logged in" state so the route guard catches the
      // next navigation immediately instead of letting it slip through.
      useAuthStore.setState({ user: null, isAuthenticated: false })
      if (window.location.pathname !== '/') {
        window.location.href = '/'
      }
      return Promise.reject(new Error('Session expired'))
    }
    response = await makeRequest()
  }

  return response
}
