// TeamSettingsPopup — réglages de l'équipe, en modale depuis la fiche
// d'équipe. Remplace l'ancienne route `/team/$id/settings`, qui obligeait à
// quitter la fiche pour renommer une équipe puis à y revenir par un lien
// « retour ».
//
// Les valeurs viennent du `TeamDetail` déjà chargé par la fiche : pas de
// requête supplémentaire, et `useUpdateTeam` invalide `['teams', teamId]`,
// exactement la clé que lit `useTeamDetail` — la carte se rafraîchit seule.
//
// La zone dangereuse porte sa PROPRE modale de confirmation, imbriquée dans
// celle-ci. C'est voulu : supprimer une équipe est irréversible et ne doit
// jamais tenir en un seul clic, même depuis une modale déjà ouverte.
import { useNavigate } from '@tanstack/react-router'
import { Settings } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { TeamDetail } from '../../api/teamProgression.api.ts'
import { useAppForm } from '../../hooks/formConfig.tsx'
import { useDeleteTeam, useUpdateTeam } from '../../queries/useTeams.ts'
import { Button } from '../ui/button.tsx'
import { Label } from '../ui/label.tsx'
import {
  Popup,
  PopupBody,
  PopupContent,
  PopupFooter,
  PopupHeader,
  PopupTitle,
} from '../ui/popup.tsx'
import { Switch } from '../ui/switch.tsx'
import { DangerZone } from './DangerZone.tsx'

type Props = {
  team: TeamDetail
  /** Doit être un `PopupTrigger` : un `Button` nu n'ouvrirait rien. */
  trigger: ReactNode
}

export function TeamSettingsPopup({ team, trigger }: Props) {
  const { t } = useTranslation('team')
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const { mutate: updateTeam, isPending: isUpdating } = useUpdateTeam(team.id)
  const { mutate: deleteTeam } = useDeleteTeam()

  // L'interrupteur vit hors du formulaire nom/description : il se
  // sauvegarde tout seul dès qu'on le bascule, pas au clic sur « Enregistrer ».
  // `teamUpdateBodySchema` exige toujours `name` (min 2 caractères) — chaque
  // bascule renvoie donc le nom courant de l'équipe avec le nouveau statut.
  const [recruiting, setRecruiting] = useState(team.recruiting)

  const form = useAppForm({
    defaultValues: {
      name: team.name,
      description: team.description ?? '',
    },
    onSubmit: ({ value }) => {
      const name = value.name.trim()
      if (!name) {
        return
      }
      updateTeam(
        { name, description: value.description.trim() || undefined },
        { onSuccess: () => setOpen(false) },
      )
    },
  })

  // Une modale n'est démontée ni à la fermeture ni au rafraîchissement des
  // données : sans ce recalage, rouvrir après un renommage — ou après l'avoir
  // fermée sur un brouillon — réafficherait l'ancienne saisie.
  useEffect(() => {
    if (open) {
      form.reset({ name: team.name, description: team.description ?? '' })
      setRecruiting(team.recruiting)
    }
  }, [open, team.name, team.description, team.recruiting, form])

  const handleRecruitingChange = (value: boolean) => {
    setRecruiting(value)
    updateTeam(
      {
        name: team.name,
        description: team.description ?? undefined,
        recruiting: value,
      },
      { onError: () => setRecruiting(!value) },
    )
  }

  return (
    <Popup open={open} onOpenChange={setOpen}>
      {trigger}
      <PopupContent>
        <PopupHeader>
          <PopupTitle
            icon={<Settings className="h-4 w-4" />}
            subtitle={t('settingsPopup.subtitle')}
          >
            {t('settingsPopup.title')}
          </PopupTitle>
        </PopupHeader>

        <form
          onSubmit={async (e) => {
            e.preventDefault()
            await form.handleSubmit()
          }}
        >
          <PopupBody className="flex flex-col gap-4">
            <form.AppField name="name">
              {(field) => <field.Input label={t('fields.name')} />}
            </form.AppField>
            <form.AppField name="description">
              {(field) => <field.Input label={t('fields.description')} />}
            </form.AppField>

            <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3">
              <div className="flex flex-col gap-0.5">
                <Label htmlFor="team-recruiting">
                  {t('settingsPopup.recruitingLabel')}
                </Label>
                <p className="text-xs text-text-light">
                  {t('settingsPopup.recruitingHint')}
                </p>
              </div>
              <Switch
                id="team-recruiting"
                checked={recruiting}
                onCheckedChange={handleRecruitingChange}
                disabled={isUpdating}
              />
            </div>

            <DangerZone
              onDelete={() =>
                deleteTeam(team.id, {
                  onSuccess: () => {
                    setOpen(false)
                    void navigate({ to: '/team' })
                  },
                })
              }
            />
          </PopupBody>

          <PopupFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isUpdating}
            >
              {t('actions.cancel')}
            </Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? t('settingsPopup.saving') : t('settingsPopup.save')}
            </Button>
          </PopupFooter>
        </form>
      </PopupContent>
    </Popup>
  )
}
