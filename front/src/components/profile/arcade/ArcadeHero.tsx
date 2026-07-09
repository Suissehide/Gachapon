import { Check, Pencil, X } from 'lucide-react'
import { useState } from 'react'

import type { FeaturedCard, UserProfile } from '../../../api/profile.api'
import {
  DEFAULT_ECONOMY,
  useEconomyConfig,
} from '../../../queries/useEconomyConfig'
import { useUpdateUsernameMutation } from '../../../queries/useProfile'
import { Button } from '../../ui/button'
import { Card, CardTitle } from '../../ui/card'
import { Input } from '../../ui/input'
import { FeaturedCardsEditorModal } from './FeaturedCardsEditorModal'
import { FeaturedCardsFan } from './FeaturedCardsFan'
import { FoilAvatar } from './FoilAvatar'

type Props = {
  profile: UserProfile
  featuredCards: FeaturedCard[]
  isOwnProfile: boolean
}

const USERNAME_RE = /^[a-zA-Z0-9_]{3,30}$/

export function ArcadeHero({ profile, featuredCards, isOwnProfile }: Props) {
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(profile.username)
  const updateUsername = useUpdateUsernameMutation()
  const canSaveName =
    USERNAME_RE.test(nameDraft) && nameDraft !== profile.username

  const startEditName = () => {
    setNameDraft(profile.username)
    setEditingName(true)
  }
  const cancelEditName = () => {
    setNameDraft(profile.username)
    setEditingName(false)
  }
  const submitName = () => {
    if (nameDraft === profile.username) {
      setEditingName(false)
      return
    }
    if (!USERNAME_RE.test(nameDraft)) {
      return
    }
    updateUsername.mutate(nameDraft, { onSuccess: () => setEditingName(false) })
  }
  const { data: economy = DEFAULT_ECONOMY } = useEconomyConfig()
  const isMax = profile.level >= economy.xp.levelCap
  const initials = profile.username[0]?.toUpperCase() ?? '?'
  const joinedYear = new Date(profile.createdAt).getFullYear()

  return (
    <Card className="rounded-3xl p-8 overflow-visible">
      <div className="grid grid-cols-1 gap-8 md:[grid-template-columns:minmax(0,320px)_minmax(0,1fr)]">
        {/* Identity column */}
        <div className="flex flex-col gap-5 min-w-0">
          <FoilAvatar initials={initials} isMax={isMax} />
          <div className="min-w-0">
            <div className="font-mono text-[11px] uppercase tracking-[.2em] text-primary-light">
              {isMax
                ? `NIV. MAX · MEMBRE ${joinedYear}`
                : `NIV. ${profile.level} · MEMBRE ${joinedYear}`}
            </div>
            {editingName ? (
              <div className="flex items-center gap-2 mt-1">
                <Input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      submitName()
                    } else if (e.key === 'Escape') {
                      cancelEditName()
                    }
                  }}
                  autoFocus
                  maxLength={30}
                  className="font-display text-2xl font-extrabold"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={submitName}
                  disabled={!canSaveName || updateUsername.isPending}
                  title="Enregistrer"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={cancelEditName}
                  title="Annuler"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="group flex items-center gap-2 mt-1">
                <h1 className="font-display text-[44px] font-extrabold leading-none text-text truncate">
                  {profile.username}
                </h1>
                {isOwnProfile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={startEditName}
                    className="text-text-light"
                    title="Changer le pseudo"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Featured cards column */}
        <div className="relative min-w-0">
          <div className="flex items-baseline justify-between mb-4 gap-2">
            <CardTitle className="text-sm uppercase tracking-wider">
              Cartes vedettes
            </CardTitle>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] text-text-light hidden md:inline">
                TOP {featuredCards.length} · PAR RARETÉ
              </span>
              {isOwnProfile && (
                <Button
                  variant="pill"
                  size="pill"
                  onClick={() => setEditorOpen(true)}
                >
                  <Pencil size={12} />
                  Éditer
                </Button>
              )}
            </div>
          </div>
          <FeaturedCardsFan cards={featuredCards} />
        </div>
      </div>

      {isOwnProfile && (
        <FeaturedCardsEditorModal
          open={editorOpen}
          initialIds={featuredCards.map((c) => c.id)}
          onClose={() => setEditorOpen(false)}
        />
      )}
    </Card>
  )
}
