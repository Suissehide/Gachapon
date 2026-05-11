import type { SkillBranch, SkillNode } from '../../api/skills.api.ts'
import { Button } from '../ui/button.tsx'
import { SheetHeader, SheetTitle } from '../ui/sheet.tsx'
import { useAppForm } from '../../hooks/formConfig.tsx'
import { useAdminCreateNode } from '../../queries/useSkills.ts'

import { EFFECT_DESCRIPTIONS, EFFECT_OPTIONS } from '../../constants/skills.constant.ts'

export function CreateNodeSheet({
  branches,
  onClose,
}: {
  branches: SkillBranch[]
  onClose: () => void
}) {
  const createNode = useAdminCreateNode()

  const branchOptions = branches.map((b) => ({ value: b.id, label: b.name }))

  const form = useAppForm({
    defaultValues: {
      branchId: branches[0]?.id ?? '',
      name: '',
      description: '',
      icon: 'Star',
      effectType: 'LUCK' as string,
      maxLevel: 3 as number | undefined,
    },
    onSubmit: ({ value }) => {
      const max = value.maxLevel ?? 3
      const levels = Array.from({ length: max }, (_, i) => ({
        nodeId: '',
        level: i + 1,
        effect: 0,
      }))
      createNode.mutate(
        {
          ...value,
          effectType: value.effectType,
          posX: 0,
          posY: 0,
          levels,
        } as Omit<SkillNode, 'id' | 'edgesFrom' | 'edgesTo'>,
        { onSuccess: onClose },
      )
    },
  })

  return (
    <>
      <SheetHeader>
        <SheetTitle>Créer un nœud</SheetTitle>
      </SheetHeader>

      <form
        onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          <form.AppField name="branchId">
            {(f) => <f.Select label="Branche" options={branchOptions} />}
          </form.AppField>
          <form.AppField name="name">
            {(f) => <f.Input label="Nom" />}
          </form.AppField>
          <form.AppField name="description">
            {(f) => <f.Input label="Description" />}
          </form.AppField>
          <form.AppField name="icon">
            {(f) => <f.Input label="Icône Lucide" />}
          </form.AppField>
          <form.AppField name="effectType">
            {(f) => <f.Select label="Effet" options={EFFECT_OPTIONS} />}
          </form.AppField>
          <form.Subscribe selector={(s) => s.values.effectType}>
            {(effectType) => (
              <p className="-mt-2 text-xs text-text-light">
                {EFFECT_DESCRIPTIONS[effectType] ?? ''}
              </p>
            )}
          </form.Subscribe>
          <form.AppField name="maxLevel">
            {(f) => <f.Number label="Niveaux max" />}
          </form.AppField>
          <p className="text-xs text-text-light">
            Le nœud sera créé en (0, 0). Glisse-le ensuite sur le canvas pour le positionner.
          </p>
        </div>

        <div className="w-full border-t border-border" />
        <div className="flex shrink-0 justify-end gap-4 px-4 py-4">
          <form.Subscribe
            selector={(s) =>
              !s.values.name || !s.values.branchId || createNode.isPending
            }
          >
            {(disabled) => (
              <Button type="submit" disabled={disabled}>
                {createNode.isPending ? 'Création…' : 'Créer'}
              </Button>
            )}
          </form.Subscribe>
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
        </div>
      </form>
    </>
  )
}
