import type { SkillConfig } from '../../api/skills.api.ts'
import { Button } from '../ui/button.tsx'
import { SheetHeader, SheetTitle } from '../ui/sheet.tsx'
import { useAppForm } from '../../hooks/formConfig.tsx'
import { useAdminUpdateConfig } from '../../queries/useSkills.ts'

export function ConfigSheet({ config }: { config: SkillConfig }) {
  const updateConfig = useAdminUpdateConfig()

  const form = useAppForm({
    defaultValues: { resetCostPerPoint: config.resetCostPerPoint },
    onSubmit: ({ value }) => {
      updateConfig.mutate({ resetCostPerPoint: value.resetCostPerPoint })
    },
  })

  return (
    <>
      <SheetHeader>
        <SheetTitle>Configuration globale</SheetTitle>
      </SheetHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
        className="flex-1 overflow-y-auto space-y-4 p-4"
      >
        <form.AppField name="resetCostPerPoint">
          {(f) => <f.Number label="Coût reset (dust / point)" />}
        </form.AppField>
        <Button type="submit" className="w-full">
          Enregistrer
        </Button>
      </form>
    </>
  )
}
