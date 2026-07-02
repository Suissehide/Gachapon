import { createFileRoute, redirect } from '@tanstack/react-router'

// /combat used to be the standalone team editor page. It's now a Popup on
// /campaign, so this route just bounces there with `?editor=true` so the
// campaign page auto-opens the editor on arrival. This preserves existing
// links and browser history entries.
export const Route = createFileRoute('/_authenticated/combat')({
  beforeLoad: () => {
    throw redirect({ to: '/campaign', search: { editor: true } })
  },
})
