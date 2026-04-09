import type { SkillBranch, SkillNode } from '../../api/skills.api.ts'
import { Button } from '../ui/button.tsx'
import { SheetHeader, SheetTitle } from '../ui/sheet.tsx'
import { useAppForm } from '../../hooks/formConfig.tsx'
import { useAdminCreateNode } from '../../queries/useSkills.ts'

const EFFECT_TYPES = [
  'REGEN',
  'LUCK',
  'DUST_HARVEST',
  'TOKEN_VAULT',
  'FREE_PULL_CHANCE',
  'MULTI_TOKEN_CHANCE',
  'GOLDEN_BALL_CHANCE',
  'SHOP_DISCOUNT',
] as const

export function CreateNodeSheet({
  branches,
  onClose,
}: {
  branches: SkillBranch[]
  onClose: () => void
}) {
  const createNode = useAdminCreateNode()

  const branchOptions = branches.map((b) => ({ value: b.id, label: b.name }))
  const effectOptions = EFFECT_TYPES.map((t) => ({ value: t, label: t }))

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
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
        className="flex-1 overflow-y-auto space-y-3 p-4"
      >
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
          {(f) => <f.Select label="Effet" options={effectOptions} />}
        </form.AppField>
        <form.AppField name="maxLevel">
          {(f) => <f.Number label="Niveaux max (1–5)" />}
        </form.AppField>
        <p className="text-xs text-text-light">
          Le nœud sera créé en (0, 0). Glisse-le ensuite sur le canvas pour le
          positionner.
        </p>
        <form.Subscribe
          selector={(s) =>
            !s.values.name || !s.values.branchId || createNode.isPending
          }
        >
          {(disabled) => (
            <Button type="submit" className="w-full" disabled={disabled}>
              {createNode.isPending ? 'Création…' : 'Créer'}
            </Button>
          )}
        </form.Subscribe>
      </form>
    </>
  )
}
