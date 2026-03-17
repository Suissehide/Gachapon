import { Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '../ui/button.tsx'
import { ConfirmPopup } from './confirm-popup.tsx'

export function DangerZone({ onDelete }: { onDelete: () => void }) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
      <h2 className="mb-3 text-sm font-bold text-destructive">
        Zone dangereuse
      </h2>
      <Button
        variant="outline"
        className="border-destructive/50 text-destructive hover:bg-destructive/10"
        onClick={() => setConfirmOpen(true)}
      >
        Supprimer l'équipe
      </Button>

      <ConfirmPopup
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        icon={<Trash2 className="h-4 w-4" />}
        title="Supprimer l'équipe"
        description="Cette action est irréversible. L'équipe sera définitivement supprimée."
        confirmLabel="Supprimer"
        onConfirm={onDelete}
      />
    </div>
  )
}
