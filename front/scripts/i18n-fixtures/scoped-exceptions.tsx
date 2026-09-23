// Fixture du garde-fou — les EXCEPTIONS SCOPÉES ne doivent PAS fuir.
//
// Les deux exceptions déclarées dans `check-i18n-hardcoded.mjs` portent un
// `files` : la liste `SECTION_IDS` (routes/guide.tsx) et la prop `code` de
// `<CodeBlock>` (routes/discord.tsx). Reproduites ici HORS de leur fichier,
// elles doivent redevenir des violations. Voir l'en-tête de
// `displayed-text.tsx` pour le statut de ces fixtures.
//
// NE PAS REFORMATER.

const SECTION_IDS = ['campagne', 'cartes'] as const

export function ScopedExceptions() {
  return (
    <div>
      <Block
        code={`// Erreur lors du chargement des cartes
console.log('Tire une capsule pour les joueurs')`}
      />
      {SECTION_IDS.map((s) => (
        <span key={s}>{s}</span>
      ))}
    </div>
  )
}
