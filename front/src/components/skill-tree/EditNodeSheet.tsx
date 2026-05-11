import type { SkillBranch, SkillNode } from '../../api/skills.api.ts'
import {
  EFFECT_DESCRIPTIONS,
  EFFECT_OPTIONS,
} from '../../constants/skills.constant.ts'
import { useAppForm } from '../../hooks/formConfig.tsx'
import {
  useAdminDeleteNode,
  useAdminUpdateNode,
} from '../../queries/useSkills.ts'
import { Button } from '../ui/button.tsx'
import { SheetHeader, SheetTitle } from '../ui/sheet.tsx'

type Props = {
  node: SkillNode
  branch: SkillBranch
  onClose: () => void
}

export function EditNodeSheet({ node, branch, onClose }: Props) {
  const updateNode = useAdminUpdateNode()
  const deleteNode = useAdminDeleteNode()

  const form = useAppForm({
    defaultValues: {
      name: node.name,
      description: node.description,
      icon: node.icon,
      effectType: node.effectType,
      maxLevel: node.maxLevel,
      levels: Array.from({ length: node.maxLevel }, (_, i) => ({
        level: i + 1,
        effect: (node.levels.find((l) => l.level === i + 1)?.effect ?? 0) as
          | number
          | undefined,
      })),
    },
    onSubmit: ({ value }) => {
      const levels = value.levels.slice(0, value.maxLevel).map((l, i) => ({
        nodeId: node.id,
        level: i + 1,
        effect: l.effect ?? 0,
      }))
      updateNode.mutate(
        {
          id: node.id,
          data: {
            name: value.name,
            description: value.description,
            icon: value.icon,
            effectType: value.effectType,
            maxLevel: value.maxLevel,
            levels,
          },
        },
        { onSuccess: onClose },
      )
    },
  })

  return (
    <>
      <SheetHeader>
        <SheetTitle>{node.name}</SheetTitle>
      </SheetHeader>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          <p className="text-xs text-text-light">
            Branche : <span className="text-text">{branch.name}</span>
          </p>

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
            {(f) => <f.Number label="Nombre de niveaux" />}
          </form.AppField>

          <form.Subscribe selector={(s) => s.values.maxLevel}>
            {(maxLevel) => (
              <>
                <p className="pt-2 text-xs font-semibold uppercase text-text-light">
                  Valeurs par niveau
                </p>
                {Array.from({ length: maxLevel }, (_, i) => (
                  <form.AppField key={i} name={`levels[${i}].effect`}>
                    {(f) => <f.Number label={`Niveau ${i + 1}`} />}
                  </form.AppField>
                ))}
              </>
            )}
          </form.Subscribe>
        </div>

        <div className="w-full border-t border-border" />
        <div className="flex shrink-0 justify-between gap-4 px-4 py-4">
          <div>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (!window.confirm(`Supprimer le nœud "${node.name}" ?`)) {
                  return
                }
                deleteNode.mutate(node.id)
                onClose()
              }}
            >
              Supprimer
            </Button>
          </div>
          <div className="flex gap-4">
            <Button type="submit" disabled={updateNode.isPending}>
              {updateNode.isPending ? 'Mise à jour…' : 'Mettre à jour'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
          </div>
        </div>
      </form>
    </>
  )
}
