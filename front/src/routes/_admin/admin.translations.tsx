import { createFileRoute } from '@tanstack/react-router'
import type { TFunction } from 'i18next'
import { CheckCircle2, Languages } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { AdminPageHeader } from '../../components/admin/shared/AdminPageHeader.tsx'
import { Badge } from '../../components/ui/badge.tsx'
import { SegmentedControl } from '../../components/ui/segmentedControl.tsx'
import i18n from '../../i18n/index.ts'
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
 *
 * Module scope : `i18n.t` (voir CLAUDE.md, pas de hook hors composant), sûr
 * ici car un changement de langue recharge toute la page.
 */
const KIND_OPTIONS = [
  { value: ALL, label: i18n.t('admin:translations.kindOptions.all') },
  { value: 'empty', label: i18n.t('admin:translations.kindOptions.empty') },
  {
    value: 'identical',
    label: i18n.t('admin:translations.kindOptions.identical'),
  },
]

/**
 * Les douze modèles traduits balayés par le back (voir
 * `localized.extension.ts` / `admin-translations.repository.ts`) résolus
 * dynamiquement via `admin:translations.entities.<entity>` — clé construite,
 * vérifiée à la main : les douze existent en fr/en (voir le rapport de
 * tâche). Une entité qui n'a pas de clé retombe sur son nom brut, comme
 * avant cette tâche (avec `ENTITY_LABELS[entity] ?? entity`), et une entité
 * absente de la réponse ne sort pas du tout dans le filtre.
 */
function entityLabel(t: TFunction<'admin'>, entity: string): string {
  const key = `translations.entities.${entity}`
  return i18n.exists(`admin:${key}`) ? t(key) : entity
}

/** Même mécanisme que `entityLabel`, pour les trois champs surveillés. */
function fieldLabel(t: TFunction<'admin'>, field: string): string {
  const key = `translations.fields.${field}`
  return i18n.exists(`admin:${key}`) ? t(key) : field
}

function rowKey(entry: MissingTranslationEntry): string {
  return `${entry.entity}-${entry.id}-${entry.field}`
}

function defectLabel(
  t: TFunction<'admin'>,
  entry: MissingTranslationEntry,
): string {
  if (entry.kind === 'identical') {
    return t('translations.defectIdentical')
  }
  return entry.missingLocale === 'FR'
    ? t('translations.defectMissingFr')
    : t('translations.defectMissingEn')
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
  const { t } = useTranslation('admin')
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
      (a, b) => entityLabel(t, a).localeCompare(entityLabel(t, b), 'fr'),
    )
    return [
      {
        value: ALL,
        label: t('translations.entityAllOption', { count: entries.length }),
      },
      ...present.map((entity) => ({
        value: entity,
        label: t('translations.entityOption', {
          label: entityLabel(t, entity),
          count: entries.filter((e) => e.entity === entity).length,
        }),
      })),
    ]
  }, [entries, t])

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
        kicker={t('common.kicker.content')}
        title={t('translations.pageTitle')}
        subtitle={t('translations.pageSubtitle')}
      />

      {isLoading ? (
        <div className="flex h-full items-center justify-center text-text-light">
          {t('translations.loading')}
        </div>
      ) : allEntries.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card text-center">
          <CheckCircle2 className="h-10 w-10 text-success" />
          <p className="text-base font-semibold text-text">
            {t('translations.emptyTitle')}
          </p>
          <p className="max-w-sm text-sm text-text-light">
            {t('translations.emptyBody')}
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
                label: t('translations.entityOption', {
                  label: o.label,
                  count:
                    o.value === ALL
                      ? allEntries.length
                      : allEntries.filter((e) => e.kind === o.value).length,
                }),
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
                  <th className="px-4 py-3">
                    {t('translations.columns.entity')}
                  </th>
                  <th className="px-4 py-3">{t('translations.columns.id')}</th>
                  <th className="px-4 py-3">
                    {t('translations.columns.field')}
                  </th>
                  <th className="px-4 py-3">
                    {t('translations.columns.defect')}
                  </th>
                  <th className="px-4 py-3">
                    {t('translations.columns.availableValue')}
                  </th>
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
                        {entityLabel(t, entry.entity)}
                      </Badge>
                    </td>
                    <td
                      className="max-w-[160px] truncate px-4 py-3 font-mono text-xs text-text-light"
                      title={entry.id}
                    >
                      {entry.id}
                    </td>
                    <td className="px-4 py-3 text-text">
                      {fieldLabel(t, entry.field)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={defectVariant(entry)}>
                        {defectLabel(t, entry)}
                      </Badge>
                    </td>
                    <td
                      className="max-w-[320px] truncate px-4 py-3 text-text-light"
                      title={entry.value || undefined}
                    >
                      {entry.value || (
                        <span className="italic text-text-light/60">
                          {t('translations.emptyValue')}
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
