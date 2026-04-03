import { SheetHeader, SheetTitle } from '../ui/sheet.tsx'
import { Button } from '../ui/button.tsx'
import { useAppForm } from '../../hooks/formConfig.tsx'
import {
  useAdminDeleteNode,
  useAdminUpdateNode,
} from '../../queries/useSkills.ts'
import type { SkillBranch, SkillNode } from '../../api/skills.api.ts'

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

const effectOptions = EFFECT_TYPES.map((t) => ({ value: t, label: t }))

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
      levels: node.levels.map((l) => ({ level: l.level, effect: l.effect as number | undefined })),
    },
    onSubmit: ({ value }) => {
      const levels = value.levels.map((l, i) => ({
        ...node.levels[i],
        effect: l.effect ?? 0,
      }))
      updateNode.mutate({
        id: node.id,
        data: {
          name: value.name,
          description: value.description,
          icon: value.icon,
          effectType: value.effectType,
          levels,
        },
      })
    },
  })

  return (
    <>
      <SheetHeader>
        <SheetTitle>{node.name}</SheetTitle>
      </SheetHeader>
      <form
        onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}
        className="space-y-3 p-4"
      >
        <p className="text-xs text-text-light">
          Branche : <span className="text-text">{branch.name}</span>
          <span className="ml-3 text-text-light">Max niveau : <span className="text-text">{node.maxLevel}</span></span>
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
          {(f) => <f.Select label="Effet" options={effectOptions} />}
        </form.AppField>

        <p className="pt-2 text-xs font-semibold uppercase text-text-light">Valeurs par niveau</p>
        {node.levels.map((_, i) => (
          <form.AppField key={i} name={`levels[${i}].effect`}>
            {(f) => <f.Number label={`Niveau ${i + 1}`} />}
          </form.AppField>
        ))}

        <Button type="submit" className="mt-2 w-full" disabled={updateNode.isPending}>
          {updateNode.isPending ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
      </form>

      <div className="px-4 pb-4">
        <Button
          variant="destructive"
          className="w-full"
          onClick={() => {
            if (!window.confirm(`Supprimer le nœud "${node.name}" ?`)) return
            deleteNode.mutate(node.id)
            onClose()
          }}
        >
          Supprimer ce nœud
        </Button>
      </div>
    </>
  )
}
