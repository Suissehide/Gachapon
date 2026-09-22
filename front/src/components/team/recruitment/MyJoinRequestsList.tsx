// MyJoinRequestsList — le pendant candidat de `JoinRequestsPanel` (la file
// du chef) : ce que MOI j'ai envoyé, posé sous les emplacements libres de
// `/team`. Sans elle, un joueur oublie ses candidatures en attente,
// recandidate ailleurs, et se heurte au plafond de 5 sans comprendre
// pourquoi la sixième est refusée.
//
// `MyJoinRequest.status` porte trois valeurs (voir `teams.constant.ts`),
// chacune avec un traitement différent et volontairement asymétrique :
//   - PENDING   → ligne avec bouton « Annuler ».
//   - DECLINED  → ligne passive, en `text-text-light`, sans bouton ni
//     pastille : elle explique elle-même pourquoi recandidater est encore
//     refusé, et disparaît toute seule quand le cooldown s'achève — c'est
//     le serveur qui cesse de l'envoyer, pas ce composant qui la masque.
//   - ACCEPTED  → jamais affichée ici. La cloche (Task 12) l'a déjà
//     annoncée (« Tu as rejoint {équipe} ») ; la remontrer ici annoncerait
//     deux fois la même nouvelle.
//
// Se masque entièrement si la liste finale est vide — pas de titre
// affiché sans rien dessous.
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'

import {
  useCancelJoinRequest,
  useMyJoinRequests,
} from '../../../queries/useRecruitment.ts'
import { Button } from '../../ui/button.tsx'

export function MyJoinRequestsList() {
  const { t } = useTranslation('team')
  const { data } = useMyJoinRequests()
  const cancel = useCancelJoinRequest()

  const requests = (data?.requests ?? []).filter(
    (request) => request.status !== 'ACCEPTED',
  )

  if (requests.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-2">
      {requests.map((request) => {
        if (request.status === 'PENDING') {
          return (
            <div
              key={request.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 text-sm"
            >
              <span className="truncate text-text">
                {t('recruitment.myRequests.pending', {
                  teamName: request.teamName,
                  timeAgo: dayjs(request.createdAt).fromNow(),
                })}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={
                  cancel.isPending && cancel.variables === request.teamId
                }
                onClick={() => cancel.mutate(request.teamId)}
              >
                {t('recruitment.myRequests.cancel')}
              </Button>
            </div>
          )
        }

        // DECLINED : `reapplyAt` porte la fin du cooldown. `diff(..., 'day',
        // true)` renvoie un écart fractionnaire (ex. 0.2 jour pour 5h) —
        // `Math.ceil` puis un plancher à 1 évitent d'afficher « dans 0 j »
        // le dernier jour du cooldown.
        const daysLeft = request.reapplyAt
          ? Math.max(
              1,
              Math.ceil(dayjs(request.reapplyAt).diff(dayjs(), 'day', true)),
            )
          : null

        return (
          <div key={request.id} className="px-3 py-2.5 text-sm text-text-light">
            {t('recruitment.myRequests.declined', {
              teamName: request.teamName,
            })}
            {daysLeft !== null &&
              t('recruitment.myRequests.reapplyIn', { count: daysLeft })}
          </div>
        )
      })}
    </div>
  )
}
