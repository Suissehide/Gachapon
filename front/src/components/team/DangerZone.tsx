import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '../ui/button.tsx'
import { ConfirmPopup } from './ConfirmPopup.tsx'

export function DangerZone({ onDelete }: { onDelete: () => void }) {
  const { t } = useTranslation('team')
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
      <h2 className="mb-3 text-sm font-bold text-destructive">
        {t('dangerZone.title')}
      </h2>
      <Button
        variant="outline"
        className="border-destructive/50 text-destructive hover:bg-destructive/10"
        onClick={() => setConfirmOpen(true)}
      >
        {t('dangerZone.deleteButton')}
      </Button>

      <ConfirmPopup
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        icon={<Trash2 className="h-4 w-4" />}
        title={t('dangerZone.confirmTitle')}
        description={t('dangerZone.confirmDescription')}
        confirmLabel={t('dangerZone.confirmLabel')}
        onConfirm={onDelete}
      />
    </div>
  )
}
