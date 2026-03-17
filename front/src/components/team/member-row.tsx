import { Crown, Shield, User, UserMinus, UserX } from 'lucide-react'
import { useState } from 'react'

import type { TeamMember } from '../../queries/useTeams.ts'
import { Button } from '../ui/button.tsx'
import { ConfirmPopup } from './confirm-popup.tsx'

const ROLE_ICON: Record<string, React.ReactNode> = {
  OWNER: <Crown className="h-3.5 w-3.5 text-yellow-400" />,
  ADMIN: <Shield className="h-3.5 w-3.5 text-accent" />,
  MEMBER: <User className="h-3.5 w-3.5 text-text-light" />,
}

export function MemberRow({
  member,
  canManage,
  isOwner,
  isMe,
  onRemove,
}: {
  member: TeamMember
  canManage: boolean
  isOwner: boolean
  isMe: boolean
  onRemove: () => void
}) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  const canRemove =
    !isMe &&
    canManage &&
    member.role !== 'OWNER' &&
    (isOwner || member.role === 'MEMBER')

  return (
    <>
      <li className="flex items-center gap-3 rounded-lg bg-background px-3 py-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 text-xs font-bold text-primary">
          {member.user.username[0]?.toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <span className="truncate text-sm font-medium text-text">
            @{member.user.username}
            {isMe && <span className="ml-1 text-xs text-text-light">(moi)</span>}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-text-light">
          {ROLE_ICON[member.role]}
          {member.role.toLowerCase()}
        </div>
        {canRemove && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setConfirmOpen(true)}
            title="Exclure"
          >
            <UserMinus className="h-4 w-4" />
          </Button>
        )}
      </li>

      <ConfirmPopup
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        icon={<UserX className="h-4 w-4" />}
        title="Exclure le membre"
        description={`Êtes-vous sûr de vouloir exclure @${member.user.username} de l'équipe ?`}
        confirmLabel="Exclure"
        onConfirm={onRemove}
      />
    </>
  )
}
