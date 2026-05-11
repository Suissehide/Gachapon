import type { SkillConfig } from '../../api/skills.api.ts'
import { Button } from '../ui/button.tsx'
import { SheetHeader, SheetTitle } from '../ui/sheet.tsx'
import { useAppForm } from '../../hooks/formConfig.tsx'
import { useAdminUpdateConfig } from '../../queries/useSkills.ts'

export function ConfigSheet({ config, onClose }: { config: SkillConfig; onClose: () => void }) {
  const updateConfig = useAdminUpdateConfig()

  const form = useAppForm({
    defaultValues: { resetCostPerPoint: config.resetCostPerPoint },
    onSubmit: ({ value }) => {
      updateConfig.mutate(
        { resetCostPerPoint: value.resetCostPerPoint },
        { onSuccess: onClose },
      )
    },
  })

  return (
    <>
      <SheetHeader>
        <SheetTitle>Configuration globale</SheetTitle>
      </SheetHeader>

      <form
        onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <form.AppField name="resetCostPerPoint">
            {(f) => <f.Number label="Coût reset (dust / point)" />}
          </form.AppField>
        </div>

        <div className="w-full border-t border-border" />
        <div className="flex shrink-0 justify-end gap-4 px-4 py-4">
          <Button type="submit" disabled={updateConfig.isPending}>
            {updateConfig.isPending ? 'Mise à jour…' : 'Mettre à jour'}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
        </div>
      </form>
    </>
  )
}
