import { createFileRoute } from '@tanstack/react-router'
import { CheckCircle2, Languages } from 'lucide-react'
import { useMemo, useState } from 'react'

import { AdminPageHeader } from '../../components/admin/shared/AdminPageHeader.tsx'
import { Badge } from '../../components/ui/badge.tsx'
import { SegmentedControl } from '../../components/ui/segmentedControl.tsx'
import type { MissingTranslationEntry } from '../../queries/useAdminTranslations.ts'
import { useAdminMissingTranslations } from '../../queries/useAdminTranslations.ts'

export const Route = createFileRoute('/_admin/admin/translations')({
  component: AdminTranslations,
})

const ALL = 'ALL'

/**
 * Les douze modèles traduits balayés par le back (voir
 * `localized.extension.ts` / `admin-translations.repository.ts`), en
 * français pour l'affichage. Une entité qui n'existe pas dans la réponse ne
 * sort pas du tout dans le filtre — construit dynamiquement plus bas.
 */
const ENTITY_LABELS: Record<string, string> = {
  quest: 'Quête',
  cardSet: 'Set de cartes',
  card: 'Carte',
  equipment: 'Équipement',
  shopItem: 'Article boutique',
  achievement: 'Succès',
  skillBranch: 'Branche de compétences',
  skillNode: 'Nœud de compétence',
  campaignStage: 'Étage de campagne',
  towerFloor: 'Étage de tour',
  raidBoss: 'Boss de raid',
  reward: 'Récompense',
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Nom',
  description: 'Description',
  label: 'Libellé',
}

function entityLabel(entity: string): string {
  return ENTITY_LABELS[entity] ?? entity
}

function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field
}

function rowKey(entry: MissingTranslationEntry): string {
  return `${entry.entity}-${entry.id}-${entry.field}`
}

function AdminTranslations() {
  const { data, isLoading } = useAdminMissingTranslations()
  const [entityFilter, setEntityFilter] = useState<string>(ALL)

  const entries = data?.entries ?? []

  const entityOptions = useMemo(() => {
    const present = Array.from(new Set(entries.map((e) => e.entity))).sort(
      (a, b) => entityLabel(a).localeCompare(entityLabel(b), 'fr'),
    )
    return [
      { value: ALL, label: `Toutes (${entries.length})` },
      ...present.map((entity) => ({
        value: entity,
        label: `${entityLabel(entity)} (${entries.filter((e) => e.entity === entity).length})`,
      })),
    ]
  }, [entries])

  const filteredEntries =
    entityFilter === ALL
      ? entries
      : entries.filter((e) => e.entity === entityFilter)

  return (
    <div className="flex h-screen flex-col p-8">
      <AdminPageHeader
        icon={Languages}
        kicker="Contenu"
        title="Traductions manquantes"
        subtitle="Contenu créé ou édité dans une seule langue — le repli de lecture le rend invisible côté joueur sans que personne ne le sache."
      />

      {isLoading ? (
        <div className="flex h-full items-center justify-center text-text-light">
          Chargement…
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card text-center">
          <CheckCircle2 className="h-10 w-10 text-success" />
          <p className="text-base font-semibold text-text">
            Aucune traduction manquante
          </p>
          <p className="max-w-sm text-sm text-text-light">
            Toutes les paires français/anglais sont complètes sur les douze
            modèles surveillés.
          </p>
        </div>
      ) : (
        <>
          {entityOptions.length > 2 && (
            <div className="mt-4">
              <SegmentedControl
                value={entityFilter}
                onChange={setEntityFilter}
                options={entityOptions}
                wrap
              />
            </div>
          )}

          <div className="mt-4 min-h-0 flex-1 overflow-auto rounded-xl border border-border bg-card">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border text-xs font-semibold uppercase tracking-wide text-text-light">
                  <th className="px-4 py-3">Entité</th>
                  <th className="px-4 py-3">Identifiant</th>
                  <th className="px-4 py-3">Champ</th>
                  <th className="px-4 py-3">Langue manquante</th>
                  <th className="px-4 py-3">Valeur disponible</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => (
                  <tr
                    key={rowKey(entry)}
                    className="border-b border-border/60 last:border-0 hover:bg-surface/50"
                  >
                    <td className="px-4 py-3">
                      <Badge variant="primary">
                        {entityLabel(entry.entity)}
                      </Badge>
                    </td>
                    <td
                      className="max-w-[160px] truncate px-4 py-3 font-mono text-xs text-text-light"
                      title={entry.id}
                    >
                      {entry.id}
                    </td>
                    <td className="px-4 py-3 text-text">
                      {fieldLabel(entry.field)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          entry.missingLocale === 'FR' ? 'warning' : 'info'
                        }
                      >
                        {entry.missingLocale === 'FR'
                          ? 'Français manquant'
                          : 'Anglais manquant'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-text-light">
                      {entry.value || (
                        <span className="italic text-text-light/60">
                          (vide)
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
