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
 * Deux défauts, deux volumes très différents.
 *
 * `identical` est l'état que la migration i18n a laissé sur TOUTE la base
 * (elle a recopié le français dans la colonne anglaise) et celui que produit
 * l'import de cartes, qui n'a qu'un nom français à envoyer. Il s'en compte
 * donc des centaines, là où `empty` ne peut naître que d'une écriture hors
 * API. Les mélanger dans une seule liste noierait les seconds : d'où le
 * filtre, et `empty` par défaut n'aurait pas de sens non plus — on ouvre sur
 * tout, mais chaque ligne dit de quel défaut il s'agit.
 */
const KIND_OPTIONS = [
  { value: ALL, label: 'Tous les défauts' },
  { value: 'empty', label: 'Langue vide' },
  { value: 'identical', label: 'Identique FR/EN' },
]

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

function defectLabel(entry: MissingTranslationEntry): string {
  if (entry.kind === 'identical') {
    return 'Anglais = français'
  }
  return entry.missingLocale === 'FR' ? 'Français manquant' : 'Anglais manquant'
}

function defectVariant(
  entry: MissingTranslationEntry,
): 'warning' | 'info' | 'neutral' {
  if (entry.kind === 'identical') {
    return 'neutral'
  }
  return entry.missingLocale === 'FR' ? 'warning' : 'info'
}

function AdminTranslations() {
  const { data, isLoading } = useAdminMissingTranslations()
  const [entityFilter, setEntityFilter] = useState<string>(ALL)
  const [kindFilter, setKindFilter] = useState<string>(ALL)

  const allEntries = data?.entries ?? []
  const entries =
    kindFilter === ALL
      ? allEntries
      : allEntries.filter((e) => e.kind === kindFilter)

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

  // Changer de défaut peut faire disparaître l'entité sélectionnée : on
  // retombe sur « toutes » plutôt que d'afficher un tableau vide sans
  // explication.
  const effectiveEntity = entityOptions.some((o) => o.value === entityFilter)
    ? entityFilter
    : ALL
  const filteredEntries =
    effectiveEntity === ALL
      ? entries
      : entries.filter((e) => e.entity === effectiveEntity)

  return (
    <div className="flex h-screen flex-col p-8">
      <AdminPageHeader
        icon={Languages}
        kicker="Contenu"
        title="Traductions manquantes"
        subtitle="Contenu dont une langue manque, ou dont l'anglais n'est que la recopie du français — le repli de lecture le rend invisible côté joueur sans que personne ne le sache."
      />

      {isLoading ? (
        <div className="flex h-full items-center justify-center text-text-light">
          Chargement…
        </div>
      ) : allEntries.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card text-center">
          <CheckCircle2 className="h-10 w-10 text-success" />
          <p className="text-base font-semibold text-text">
            Aucune traduction manquante
          </p>
          <p className="max-w-sm text-sm text-text-light">
            Sur les douze modèles surveillés, aucune paire n'a de langue vide ni
            d'anglais recopié du français. Les identités volontaires (prénoms
            nus, cognats, gabarits bilingues) ne sont pas comptées.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-4">
            <SegmentedControl
              value={kindFilter}
              onChange={setKindFilter}
              options={KIND_OPTIONS.map((o) => ({
                ...o,
                label:
                  o.value === ALL
                    ? `${o.label} (${allEntries.length})`
                    : `${o.label} (${allEntries.filter((e) => e.kind === o.value).length})`,
              }))}
              wrap
            />
          </div>

          {entityOptions.length > 2 && (
            <div className="mt-3">
              <SegmentedControl
                value={effectiveEntity}
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
                  <th className="px-4 py-3">Défaut</th>
                  <th className="px-4 py-3">Valeur disponible</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => (
                  <tr
                    key={rowKey(entry)}
                    className="border-b border-border/60 last:border-0 hover:bg-surface-2/50"
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
                      <Badge variant={defectVariant(entry)}>
                        {defectLabel(entry)}
                      </Badge>
                    </td>
                    <td
                      className="max-w-[320px] truncate px-4 py-3 text-text-light"
                      title={entry.value || undefined}
                    >
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
