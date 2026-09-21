/**
 * Catalogue français des messages d'erreur — texte de code, pas contenu de
 * jeu. Sert de référentiel de clés pour `ErrorMessageKey` (voir `keys.ts`) :
 * toute clé ajoutée ici doit recevoir sa traduction dans `en.ts`, sous peine
 * d'échec de compilation.
 *
 * Convention de nommage : `<domaine>.<sujet>`, jamais le texte du message
 * (voir task-6-brief.md). Un message identique dans deux endroits du code
 * partage la même clé ; deux messages qui se ressemblent mais signalent des
 * échecs différents reçoivent des clés distinctes.
 */
export const FR_MESSAGES = {
  'user.notFound': 'Utilisateur introuvable',
  'team.maxTeamsPerUser': 'Maximum {{max}} équipes par utilisateur',
} as const
