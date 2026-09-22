import { Send } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useInviteMember } from '../../queries/useTeams.ts'
import { Button } from '../ui/button.tsx'
import { Input } from '../ui/input.tsx'

export function InviteMemberForm({ teamId }: { teamId: string }) {
  const { t } = useTranslation('team')
  const { mutate: invite, isPending } = useInviteMember(teamId)
  const [input, setInput] = useState('')
  const [error, setError] = useState('')

  const handleInvite = () => {
    const value = input.trim()
    if (!value) {
      return
    }
    setError('')
    const isEmail = value.includes('@')
    invite(isEmail ? { email: value } : { username: value }, {
      onSuccess: () => setInput(''),
      onError: (err) => setError(err.message),
    })
  }

  return (
    <div className="mb-6 rounded-xl border border-border bg-card p-4">
      <h2 className="mb-3 text-sm font-bold text-text">
        {t('inviteForm.title')}
      </h2>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            if (error) {
              setError('')
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleInvite()
            }
          }}
          placeholder={t('inviteForm.placeholder')}
        />
        <Button onClick={handleInvite} disabled={isPending || !input.trim()}>
          <Send className="h-4 w-4" />
          {t('inviteForm.submit')}
        </Button>
      </div>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  )
}
