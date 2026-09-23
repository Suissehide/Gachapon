// changelog-sync: dernier commit intégré au changelog. Mis à jour par la commande /changelog.
// last-synced-commit: cc36e4de9536e882a1351170d70442c896dc5c02
import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { LandingNavbar } from '../components/custom/LandingNavbar.tsx'
import { SeoHead } from '../components/shared/SeoHead.tsx'
import { cn } from '../libs/utils.ts'

type ChangeType = 'new' | 'improved' | 'fixed'

type ChangelogEntry = {
  type: ChangeType
}

type ChangelogRelease = {
  version: string
  entries: ChangelogEntry[]
}

const TYPE_META: Record<ChangeType, { className: string }> = {
  new: {
    className: 'bg-primary/15 text-primary border-primary/30',
  },
  improved: {
    className: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  },
  fixed: {
    className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  },
}

/**
 * Le texte de chaque version vit dans `locales/{fr,en}/changelog.json`, sous
 * `releases.<versionKey>`. `versionKey` se dérive du numéro de version
 * (« 3.2 » → « v3_2 ») plutôt que d'être stocké en double ici — un point
 * dont doit tenir compte la commande `/changelog` en ajoutant une entrée.
 * Le tableau ci-dessous ne porte donc que la structure (numéro de version,
 * nombre d'entrées et leur type new/improved/fixed) : aucun texte, pour
 * qu'ajouter une version n'ait qu'un seul endroit où toucher le texte —
 * les deux fichiers de locale, jamais ce fichier.
 */
const RELEASES: ChangelogRelease[] = [
  {
    version: '3.3',
    entries: [
      { type: 'new' },
      { type: 'improved' },
      { type: 'improved' },
      { type: 'improved' },
      { type: 'new' },
      { type: 'fixed' },
    ],
  },
  {
    version: '3.2',
    entries: [{ type: 'new' }, { type: 'fixed' }, { type: 'improved' }],
  },
  {
    version: '3.1',
    entries: [
      { type: 'new' },
      { type: 'new' },
      { type: 'improved' },
      { type: 'improved' },
      { type: 'improved' },
      { type: 'improved' },
      { type: 'fixed' },
    ],
  },
  {
    version: '3.0',
    entries: [
      { type: 'new' },
      { type: 'new' },
      { type: 'new' },
      { type: 'new' },
      { type: 'new' },
      { type: 'improved' },
    ],
  },
  {
    version: '2.1',
    entries: [
      { type: 'new' },
      { type: 'new' },
      { type: 'new' },
      { type: 'new' },
      { type: 'improved' },
      { type: 'fixed' },
    ],
  },
  {
    version: '2.0',
    entries: [
      { type: 'new' },
      { type: 'new' },
      { type: 'new' },
      { type: 'new' },
      { type: 'improved' },
      { type: 'improved' },
    ],
  },
  {
    version: '1.9',
    entries: [
      { type: 'new' },
      { type: 'improved' },
      { type: 'improved' },
      { type: 'fixed' },
    ],
  },
  {
    version: '1.7',
    entries: [
      { type: 'new' },
      { type: 'new' },
      { type: 'improved' },
      { type: 'new' },
    ],
  },
  {
    version: '1.6',
    entries: [
      { type: 'new' },
      { type: 'new' },
      { type: 'improved' },
      { type: 'new' },
      { type: 'new' },
      { type: 'improved' },
    ],
  },
  {
    version: '1.5',
    entries: [
      { type: 'new' },
      { type: 'improved' },
      { type: 'new' },
      { type: 'improved' },
      { type: 'new' },
      { type: 'improved' },
    ],
  },
  {
    version: '1.4',
    entries: [
      { type: 'new' },
      { type: 'new' },
      { type: 'new' },
      { type: 'improved' },
      { type: 'improved' },
    ],
  },
  {
    version: '1.3',
    entries: [
      { type: 'new' },
      { type: 'new' },
      { type: 'new' },
      { type: 'new' },
    ],
  },
  {
    version: '1.2',
    entries: [
      { type: 'new' },
      { type: 'new' },
      { type: 'new' },
      { type: 'improved' },
    ],
  },
  {
    version: '1.1',
    entries: [
      { type: 'new' },
      { type: 'new' },
      { type: 'new' },
      { type: 'new' },
      { type: 'new' },
    ],
  },
  {
    version: '1.0',
    entries: [
      { type: 'new' },
      { type: 'new' },
      { type: 'new' },
      { type: 'new' },
      { type: 'new' },
    ],
  },
]

/** « 3.2 » → « v3_2 » : un point (version mineure) n'est pas une clé JSON valide comme séparateur de niveau. */
function versionKey(version: string): string {
  return `v${version.replace(/\./g, '_')}`
}

export const Route = createFileRoute('/changelog')({
  component: ChangelogPage,
})

function ChangelogPage() {
  const { t } = useTranslation('changelog')
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SeoHead path="/changelog" />
      <LandingNavbar />
      <main className="pt-32 pb-24 px-6 lg:px-10 max-w-3xl mx-auto">
        <p className="text-[11px] font-semibold text-text-light/50 uppercase tracking-[0.2em] mb-4">
          {t('page.eyebrow')}
        </p>
        <h1 className="text-4xl font-black tracking-tight mb-4">
          {t('page.title')}
        </h1>
        <p className="text-text-light text-base leading-relaxed mb-16 max-w-xl">
          {t('page.description')}
        </p>

        <div className="relative">
          <div
            className="absolute left-0 top-2 bottom-2 w-px bg-border"
            aria-hidden
          />
          <ol className="space-y-14">
            {RELEASES.map((release) => {
              const vKey = versionKey(release.version)
              return (
                <li key={release.version} className="relative pl-8">
                  <span
                    className="absolute left-0 top-1.5 -translate-x-1/2 h-3 w-3 rounded-full bg-primary ring-4 ring-background"
                    aria-hidden
                  />
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1">
                    <span className="inline-flex items-center rounded-full bg-card border border-border px-2.5 py-0.5 text-xs font-bold tracking-wide">
                      v{release.version}
                    </span>
                    <h2 className="text-xl font-bold tracking-tight">
                      {t(`releases.${vKey}.title`)}
                    </h2>
                  </div>
                  <p className="text-[11px] font-semibold text-text-light/50 uppercase tracking-[0.15em] mb-3">
                    {t(`releases.${vKey}.date`)}
                  </p>
                  <p className="text-text-light text-sm leading-relaxed mb-5">
                    {t(`releases.${vKey}.summary`)}
                  </p>
                  <ul className="space-y-2.5">
                    {release.entries.map((entry, index) => {
                      const entryKey = `e${index + 1}`
                      return (
                        <li
                          key={`${vKey}-${entryKey}`}
                          className="flex items-start gap-3"
                        >
                          <span
                            className={cn(
                              'mt-0.5 shrink-0 inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                              TYPE_META[entry.type].className,
                            )}
                          >
                            {t(`types.${entry.type}`)}
                          </span>
                          <span className="text-sm leading-relaxed text-foreground/90">
                            {t(`releases.${vKey}.entries.${entryKey}`)}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </li>
              )
            })}
          </ol>
        </div>
      </main>
    </div>
  )
}
