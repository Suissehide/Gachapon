import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import { SLOT_ORDER } from '../../components/collection/EquipmentSlotsPanel.tsx'
import { EquipmentWorkshop } from '../../components/collection/EquipmentWorkshop.tsx'
import { PageShell } from '../../components/shared/PageShell.tsx'
import { useUserCollection } from '../../queries/useCollection'
import { useAuthStore } from '../../stores/auth.store'

export const Route = createFileRoute(
  '/_authenticated/collection_/$userCardId/equipment',
)({
  validateSearch: z.object({ slot: z.enum(SLOT_ORDER).optional() }),
  component: EquipmentPage,
})

function EquipmentPage() {
  const { t } = useTranslation('collection')
  const { userCardId } = Route.useParams()
  const { slot = 'WEAPON' } = Route.useSearch()
  const navigate = Route.useNavigate()
  const user = useAuthStore((s) => s.user)
  const collection = useUserCollection(user?.id)
  const userCard = collection.data?.cards.find((c) => c.id === userCardId)

  return (
    <PageShell width="wide">
      {userCard ? (
        <EquipmentWorkshop
          userCard={userCard}
          slot={slot}
          onSlotChange={(s) => navigate({ search: { slot: s }, replace: true })}
        />
      ) : (
        collection.isSuccess && (
          <p className="py-14 text-center text-sm text-text-light">
            {t('collection:workshop.notFound')}
          </p>
        )
      )}
    </PageShell>
  )
}
