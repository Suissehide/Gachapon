#!/usr/bin/env node
// Garde-fou anti-régression du français en dur — lot 2, tâche 2.
//
// Échoue si une chaîne française apparaît dans `front/src/` hors de
// `src/i18n/locales/` (où le français en dur est le contenu attendu).
//
// Deux détecteurs, appliqués ligne par ligne, hors commentaires :
//   1. un caractère accentué français (à, é, ç, œ, …) ;
//   2. un mot français fréquent SANS accent (« vous », « les », « pour »…),
//      recherché comme mot entier (\b...\b), jamais en sous-chaîne — sinon
//      « les » matcherait dans « files » ou "roles".
//
// Ce script échouera massivement tant que l'extraction (tâches suivantes du
// lot) n'a pas eu lieu : c'est attendu, pas un bug de ce script. Il n'est
// PAS branché sur `lint` ni sur le build (décision actée dans
// global-constraints.md / task-2-brief.md) — chaque tâche d'extraction le
// lance à la main sur son périmètre, la tâche 12 le branchera sur la CI une
// fois l'extraction terminée.
//
// Usage :
//   node scripts/check-i18n-hardcoded.mjs                 # tout src/
//   node scripts/check-i18n-hardcoded.mjs src/components/shop
//   node scripts/check-i18n-hardcoded.mjs "src/routes/**"  # motif glob simple
//   node scripts/check-i18n-hardcoded.mjs src/routes src/components/shop
//
// Les arguments, s'ils sont fournis, sont résolus depuis la racine de
// `front/` (pas depuis le cwd) : le script peut donc être lancé depuis
// n'importe où.
//
// PLUSIEURS CHEMINS (corrigé, tâche 12). Jusqu'ici ce script ne lisait que
// `process.argv[2]` et IGNORAIT SILENCIEUSEMENT les suivants : un
// `node scripts/check-i18n-hardcoded.mjs src/a src/b` scannait `src/a` seul
// et annonçait « OK » pour les deux. Ce piège a produit de fausses mesures
// sur ce chantier — une tâche a cru avoir vérifié deux répertoires. Le
// script balaie désormais l'UNION DÉDUPLIQUÉE de tous les chemins donnés,
// comme `check-i18n-keys.mjs` le fait déjà.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FRONT_ROOT = path.resolve(__dirname, '..')
const SRC_ROOT = path.join(FRONT_ROOT, 'src')
const LOCALES_DIR = path.join(SRC_ROOT, 'i18n', 'locales')
const SCAN_EXTENSIONS = new Set(['.ts', '.tsx'])

// ---------------------------------------------------------------------------
// Détection du français
// ---------------------------------------------------------------------------

const ACCENT_RE = /[àâäéèêëïîôöùûüÿçœæÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÇŒÆ]/g

/**
 * Mots français fréquents SANS accent, susceptibles de passer inaperçus
 * autrement (« Connexion », « Boutique », « Retour », « Niveau » n'ont pas
 * besoin d'accent pour être du français). Chaque entrée : un mot réellement
 * fréquent dans de la copie d'interface, pas une particule isolée à fort
 * risque de collision (« un », « on », « ce » sont volontairement exclus :
 * trop courts, trop souvent des morceaux d'identifiants techniques y
 * compris à l'intérieur d'un run \w continu... en pratique \b les protège
 * déjà, mais le bruit qu'ils généreraient ne vaudrait pas le signal).
 * Recherchés comme mots entiers uniquement — voir buildWordRegex.
 */
const FRENCH_WORDS = [
  // --- particules et déterminants (liste d'origine, tâche 2) ---
  'vous', // pronom, très fréquent dans la copie UI ("vous avez obtenu…")
  'votre', // idem, déterminant possessif
  'vos',
  'notre',
  'nos',
  'leur',
  'leurs',
  'des', // article contracté, omniprésent
  'les',
  'une',
  'dans',
  'pour',
  'avec',
  'sans', // exception connue : "sans-serif" (CSS) — voir EXCEPTIONS
  'sur',
  'entre',
  'cette',
  'ces',
  'mais',
  'tout',
  'tous',
  'toute',
  'toutes',
  'quand',
  'quoi',
  'chaque',
  'toujours',
  'jamais',
  'plusieurs',
  'aucun',
  'aucune',
  'est', // verbe être, 3e pers. — risque connu : "EST" (fuseau horaire),
  // pas rencontré dans ce dépôt à ce jour ; à surveiller si un jour du
  // code touche des fuseaux horaires US.

  // --- vocabulaire des MESSAGES D'ERREUR (tâche 6, round 1) ---
  // Le trou que cette famille comble : « Erreur lors de … » est le motif le
  // plus fréquent du dépôt (c'est la forme des 153 messages de repli de
  // `src/api/`), et AUCUN de ses mots n'était couvert. « Erreur lors du
  // chargement de la campagne » ne porte pas un seul accent et pas un seul
  // mot de la liste d'origine : le garde-fou était aveugle à sa cible la
  // plus courante. Constaté pour de bon : `queries/useGacha.ts` et
  // `queries/useAdminMedia.ts` gardaient du français non extrait que le
  // scan déclarait propre.
  'erreur', // EN: error
  'lors', // aucun équivalent EN
  'chargement', // EN: loading
  'enregistrement', // EN: saving
  'echec', // EN: failure — « échec » est déjà pris par l'accent ; la forme
  // sans accent garde le filet en cas de coquille
  'ajout', // EN: addition
  'envoi', // EN: sending
  'changement', // EN: change

  // --- noms et verbes d'interface fréquents (tâche 6, round 1) ---
  'retour', // EN: back
  'connexion', // EN: connection (orthographe différente)
  'niveau', // EN: level
  'joueur',
  'joueurs',
  'cartes',
  'jour', // se déclencherait sur « jour fixe » / « soup du jour », emprunts
  // anglais rares ; gardé pour un apport marginal de 4, le seul des cinq
  // mots à risque qui en avait un
  'jours',
  'autre',
  'autres',
  'depuis',
  'voir',
  'utilisateur',
  'utilisateurs',
  'administrateur',
  'invalide', // EN: invalid (orthographe différente)
  'invalides',
  'identifiants',
  'compte',
  'comptes',
  'existant',
  'trop',
  'tentatives',
  'connecter',
  'campagne', // EN: campaign (orthographe différente)
  'tirage',
  'tirages',
  'variantes',
  'ajouter',
  'supprimer',
  'afficher',
  'enregistrer',
  'envoyer',
  'annuler',
  'valider',
  'confirmer',
  'continuer',
  'commencer',
  'fermer',
  'choisir',
  'essaie',
  'essayer',
  'attends',
  'actuel',
  'actuelle',
  'prochain',
  'prochaine',
  'dernier',
  'suivant',
  'suivante',
  'disponible',
  'disponibles',
  'manquant',
  'pleine',

  // --- mots COURTS (tâche 6, rounds 1 et 2) ---
  // Deux seulement ont survécu, et pas au flair. Chaque candidat a été jugé
  // sur trois mesures, pas une :
  //   (1) FAUX POSITIFS — scan complet, lecture des lignes NOUVELLEMENT
  //       signalées, une par une ;
  //   (2) APPORT SEUL — le mot ajouté à la liste d'ORIGINE (32 mots) : ce
  //       qu'il rattrape que personne d'autre ne rattrapait ;
  //   (3) APPORT MARGINAL — le mot retiré de la liste FINALE : ce qu'on perd
  //       vraiment à s'en passer, une fois tout le reste en place.
  // Les deux derniers divergent beaucoup et répondent à des questions
  // différentes : (2) dit si le mot est un bon détecteur de français, (3) dit
  // s'il mérite sa ligne dans CETTE liste. Ne pas citer l'un pour l'autre.
  'du', // seul +36 · marginal +6 — le plus rentable des mots courts ;
  // 23 lignes nouvelles au scan, toutes du français réel
  'ou', // seul +3 · marginal +2 ; 7 lignes nouvelles, toutes du français réel
]

/**
 * Mots COURTS essayés et REJETÉS, avec le contre-exemple qui les disqualifie.
 * Ne pas les réintroduire sans traiter le cas cité.
 *
 *   'en'  → 62 lignes, dont de vrais faux positifs : `missingLocale: 'FR' | 'EN'`
 *           (api/admin-translations.api.ts), `id="branch-name-en"`,
 *           `{ fr: 'FR', en: 'EN' }`. « en » est le CODE de la langue
 *           anglaise : impossible à distinguer du mot français.
 *   'on'  → 15 lignes, dont `wsClient.on((event) => …)` dans six fichiers :
 *           c'est un nom de méthode JS. Et « on » est un mot anglais.
 *   'aux' → FAUX POSITIF DÉMONTRÉ sur `'aux-input'` (comme « aux cable »,
 *           « aux port ») : abréviation anglaise courante d'auxiliary, et
 *           exactement la même forme que `sans-serif`. Apport seul : 0.
 *   'si'  → FAUX POSITIF DÉMONTRÉ sur `'SI units'` (et Si, le silicium).
 *           Apport seul : 0.
 *   'ce'  → FAUX POSITIF DÉMONTRÉ sur `'CE marking'`. Apport seul : 1.
 *   'au'  → symbole chimique de l'or. Apport seul : 1.
 *   'ne', 'pas' → aucun faux positif trouvé, mais apport seul NUL : toute
 *           chaîne qui les contient porte déjà un autre mot de la liste.
 *           Du risque sans bénéfice.
 *   'la'  → rejeté sur le CRITÈRE seulement : « LA » (Los Angeles), « la »
 *           (la note de musique) sont de l'anglais courant. ATTENTION, ne pas
 *           le croire sans valeur pour autant : son apport SEUL est de **35**,
 *           soit quasiment celui de `du` (36) — c'est le meilleur mot court
 *           de la langue après `du`. Son apport marginal, lui, tombe à 7.
 *           Si une session future veut le réhabiliter, le bon geste est de
 *           lui écrire une EXCEPTION (comme `sans-serif` en a une), pas de
 *           l'ajouter nu.
 *   'et', 'le', 'un' → même critère (« et al. », « Le » patronymique,
 *           « un- » préfixe anglais). Apport seul faible pour 'et' (3).
 *
 * Mots écartés parce qu'ils s'écrivent PAREIL en anglais — les ajouter
 * signalerait de l'anglais légitime : 'impossible', 'combat', 'modification',
 * 'creation', 'boutique', 'nouveau', 'nouvelle', 'mise', 'charger' (a phone
 * charger), 'vide' (vide supra), 'machines', 'notifications', 'admin',
 * 'config', 'stats', 'raid', 'nature', 'rare'.
 *
 * Quatre mots ont été RETIRÉS au round 2 après avoir été testés contre une
 * fixture d'anglais technique réaliste — ils violaient ce même critère :
 *   'modifier'    → « access modifier »
 *   'suppression' → « noise suppression »
 *   'avant'       → « avant-garde » (exactement le motif de `sans-serif`,
 *                   qui a dû se payer une exception)
 *   'carte'       → « à la carte »
 * Leur apport marginal était de 0 pour les quatre : les retirer ne coûte
 * rien. Le pluriel 'cartes' reste, lui : apport 1, et « à la carte » est au
 * singulier. Garder une fixture d'anglais technique sous la main et la
 * repasser à chaque ajout — c'est elle qui a fait tomber ces quatre-là, pas
 * la relecture.
 *
 * LIMITE STRUCTURELLE, mesurée. Sur les 587 chaînes françaises réellement
 * extraites dans `src/i18n/locales/fr/`, ce détecteur en reconnaît 456
 * (77,7 %), contre 332 (56,6 %) avec la liste d'origine (32 mots → 96). Les
 * 131 restantes
 * sont presque toutes des LIBELLÉS D'UN SEUL MOT dont l'orthographe est la
 * même dans les deux langues : « Rare », « Nature », « Admin », « Config »,
 * « Stats », « Raid », « Machines », « Notifications », « Boutique »,
 * « Dashboard ». Aucune liste de mots ne peut les distinguer de l'anglais.
 * **Ce script attrape des phrases, pas des étiquettes** : un `OK` sur un
 * répertoire ne prouve pas l'absence de français, il prouve l'absence de
 * français *en phrases*. Relire les libellés courts à la main — c'est ainsi
 * qu'a été trouvé `RARITY_OPTIONS`, qui affichait « Common / Uncommon /
 * Epic / Legendary » en français sur six écrans sans que rien ne crie.
 *
 * ET CE 77,7 % EST UNE BORNE OPTIMISTE, pas un taux de couverture. Le
 * corpus de validation, c'est `locales/fr/` : le français que nous avons
 * DÉJÀ SU EXTRAIRE. Il ne contient, par construction, rien de ce que
 * personne n'a jamais repéré — ni les tournures qu'aucune tâche n'a encore
 * lues, ni les libellés d'un mot qui n'ont jamais été reconnus comme du
 * français. Mesurer un détecteur sur ce qu'il a aidé à trouver le flatte.
 * Le vrai rappel sur du français inconnu est inférieur ; de combien, ce
 * corpus ne peut pas le dire.
 */

function buildWordRegex() {
  const alternatives = FRENCH_WORDS.map((w) =>
    w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
  )
  return new RegExp(`\\b(?:${alternatives.join('|')})\\b`, 'gi')
}

const WORD_RE = buildWordRegex()

/**
 * ---------------------------------------------------------------------------
 * MASQUES STRUCTURELS — ce qui n'est PAS du texte affiché (tâche 12)
 * ---------------------------------------------------------------------------
 *
 * Appliqués à la source ENTIÈRE (après `stripComments`), en remplaçant chaque
 * correspondance par des espaces de même longueur, les sauts de ligne
 * préservés — le numéro de ligne et la colonne des occurrences restantes ne
 * bougent donc pas.
 *
 * Ce sont des RÈGLES, pas des exceptions : elles décrivent des positions
 * syntaxiques dans lesquelles une chaîne ne peut pas être du texte d'écran.
 * Chacune a été ajoutée contre un faux positif RÉEL, cité avec son fichier et
 * sa ligne d'avant-correction.
 *
 * ┌─ CE QUE CES MASQUES COÛTENT ─────────────────────────────────────────────┐
 * │ Ils créent par construction des angles morts : du français placé dans    │
 * │ une de ces positions ne sera plus signalé PAR CE SCRIPT. Pour chacun,    │
 * │ l'entrée dit qui d'autre le rattrape. Ne pas en ajouter sans répondre à  │
 * │ cette question-là.                                                       │
 * └──────────────────────────────────────────────────────────────────────────┘
 */
const STRUCTURAL_MASKS = [
  {
    name: 'clé de traduction, argument littéral de t()',
    // `t('…')`, `i18n.t('…')`, et l'alias `tShop('…')` (aucun cas dans ce
    // dépôt aujourd'hui, mais check-i18n-keys.mjs le résout déjà : les deux
    // scripts doivent reconnaître le même parc d'appels, sinon l'un couvre un
    // angle mort que l'autre n'a pas).
    // On ne masque QUE jusqu'au guillemet fermant du PREMIER argument : un
    // `t('ns:clé', { defaultValue: 'Du français' })` reste scanné sur sa
    // seconde moitié.
    pattern:
      /(?:\bi18n\.t|\bt|\bt[A-Z][A-Za-z0-9_]*)\(\s*(?:'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`[^`$\\\n]*`)/g,
    provenBy:
      'src/routes/guide.tsx — 7 occurrences avant correction, toutes du type ' +
      "`{t('sections.cartes.tip')}` ou `title={t('sectionLabels.campagne')}` : " +
      '« cartes » et « campagne » y sont des SEGMENTS DE CLÉ, jamais affichés.',
    blindSpotCoveredBy:
      "check-i18n-keys.mjs — un `t('Aucune carte disponible')` (du français " +
      "passé comme clé) n'existe pas dans les JSON et y est signalé « clé " +
      'introuvable ». Vérifié par fixture, voir le rapport de la tâche 12.',
  },
  {
    name: 'clé de traduction, attribut i18nKey de <Trans>',
    pattern:
      /\bi18nKey\s*=\s*(?:"[^"\n]*"|'[^'\n]*'|\{\s*(?:'[^'\n]*'|"[^"\n]*")\s*\})/g,
    provenBy:
      'src/routes/guide.tsx — 9 occurrences avant correction, du type ' +
      '`i18nKey="sections.campagne.intro"`.',
    blindSpotCoveredBy:
      'check-i18n-keys.mjs, qui résout précisément cette forme (`i18nKey="…"`).',
  },
  {
    name: "valeurs d'attributs JSX qui ne peuvent contenir qu'un identifiant",
    // DEUX attributs, et deux seulement. La liste a été réduite en revue de la
    // tâche 12, et le critère de cette réduction vaut pour toute demande
    // d'ajout future :
    //
    //   **une exception à un garde-fou se mérite par un faux positif OBSERVÉ,
    //   elle ne s'accorde jamais par précaution.**
    //
    // `className` et `data-*` avaient été ajoutés ici par prudence. Ils ne
    // corrigeaient AUCUN faux positif constaté : ils achetaient zéro silence
    // utile et vendaient un angle mort permanent, sur un attribut dont rien ne
    // garantit qu'il ne portera jamais de texte (`className`) et sur une
    // famille ouverte par construction (`data-*`). Retirés. Le scan reste vert
    // sans eux — leur retrait ne coûte donc littéralement rien.
    //
    // Ce qui reste :
    //   `id`      — faux positif réel et mesuré (`id="campagne"`,
    //               `id="cartes"` dans routes/guide.tsx) ;
    //   `htmlFor` — par symétrie stricte avec `id` : la valeur d'un `htmlFor`
    //               EST un `id`, elle ne peut rien être d'autre.
    //
    // Forme chaîne littérale uniquement (`id="x"`), pas la forme expression
    // (`id={x}`) : une expression peut contenir n'importe quoi, y compris du
    // texte, et la masquer ouvrirait un trou bien plus large que le faux
    // positif qu'on corrige.
    //
    // Ne SONT PAS dans cette liste, et ne doivent jamais y entrer, les
    // attributs dont la valeur EST du texte lu par un humain ou un lecteur
    // d'écran : `title`, `placeholder`, `alt`, `aria-label`, `label`,
    // `aria-description`, `value` d'une <option>. Une fixture les repasse à
    // chaque modification de ce script (`i18n-fixtures/displayed-text.tsx`),
    // et une autre fige le fait que `className` et `data-*` restent scannés
    // (`i18n-fixtures/unmasked-attributes.tsx`).
    pattern: /\b(?:id|htmlFor)\s*=\s*(?:"[^"\n]*"|'[^'\n]*')/g,
    provenBy:
      'src/routes/guide.tsx — 2 occurrences avant correction (`id="campagne"`, ' +
      '`id="cartes"`) : des identifiants d\'ancre `#<id>`, stables et ' +
      'indépendants de la langue par décision explicite du fichier.',
    blindSpotCoveredBy:
      "Personne — c'est un angle mort net, et le seul des trois masques qui " +
      "n'est rattrapé par aucun autre garde-fou. Il est aussi étroit qu'il " +
      "peut l'être : deux attributs dont la valeur est, par définition, un " +
      'identifiant. Du français qui y atterrirait ne serait de toute façon ' +
      'pas affiché.',
  },
]

/**
 * CE QUE LA PREUVE HISTORIQUE COUVRE, ET CE QU'ELLE NE COUVRE PAS.
 *
 * La méthode de non-régression de ce script est de le rejouer sur un commit
 * ancien (`git archive ee033b97 front/src` puis scan) et de vérifier qu'il y
 * voit toujours ce qu'il y voyait : 5977 → 5945 occurrences à l'ajout des
 * masques ci-dessus, les 32 écarts étant tous identifiés un par un.
 *
 * Cette preuve est PARTIELLE, et il faut le savoir avant de s'y fier :
 * à `ee033b97`, `routes/guide.tsx` n'était pas encore extrait — il ne
 * contenait donc **ni appel `t()` ni attribut `i18nKey`**. Le rejeu historique
 * n'exerce, de fait, que le masque `id=`. Les deux autres ne sont prouvés que
 * sur l'arbre COURANT (18 occurrences masquées au total, toutes relues à la
 * main) et par les fixtures de `check-i18n-guard-selftest.mjs`.
 *
 * Conséquence pratique : un rejeu historique vert ne dispense pas de relancer
 * l'auto-test. Les deux mesurent des choses différentes, et `check:i18n`
 * enchaîne les deux pour cette raison.
 */

/**
 * ---------------------------------------------------------------------------
 * EXCEPTIONS EXPLICITES — du texte affiché qu'on garde en français
 * ---------------------------------------------------------------------------
 *
 * Chaînes qui déclencheraient un des détecteurs ci-dessus sans devoir être
 * traduites. Masquées de la même façon que les masques structurels (source
 * entière, espaces de même longueur, sauts de ligne préservés).
 *
 * `files` (facultatif) restreint l'exception aux chemins cités, relatifs à
 * `front/` — sans lui, l'exception vaut pour tout le dépôt. **Préférer
 * toujours la forme scopée** : une exception globale est une passoire
 * permanente, une exception scopée ne peut pas se propager à un fichier
 * qu'on n'a pas relu.
 *
 * Chaque entrée doit être justifiée par un cas réel constaté dans ce dépôt,
 * pas par prudence générique.
 */
const EXCEPTIONS = [
  {
    pattern: /sans-serif/gi,
    reason:
      'Pile de police CSS générique (RevealGrid.tsx, dev-reveal.tsx, _globals.css) : ' +
      '"sans" y est un token isolé par un tiret, donc \\bsans\\b s\'y déclenche ' +
      "sans qu'il s'agisse de français.",
  },
  {
    files: ['src/routes/guide.tsx'],
    pattern: /const SECTION_IDS = \[[\s\S]*?\] as const/g,
    reason:
      "Liste des identifiants d'ancre du guide (`#campagne`, `#cartes`…). Ce " +
      "sont des fragments d'URL, pas des libellés : le fichier le dit lui-même " +
      '(« Les ids sont stables : ils pilotent les ancres `#<id>` et sont ' +
      'indépendants de la langue. Les libellés viennent de ' +
      '`guide:sectionLabels.<id>` »). Les traduire casserait les liens ' +
      'existants vers le guide. 2 occurrences avant correction.',
  },
  {
    files: ['src/routes/discord.tsx'],
    pattern: /\bcode=(?:\{`[\s\S]*?`\}|"[^"\n]*"|'[^'\n]*')/g,
    reason:
      "Blocs de code d'exemple du bot Discord (prop `code` de `<CodeBlock>`, " +
      'utilisée nulle part ailleurs dans le dépôt — vérifié). Ce sont des ' +
      'sources JavaScript que le lecteur copie-colle pour faire tourner SON ' +
      "bot : les `.setDescription('Tire une capsule Gachapon')`, les " +
      "`editReply('❌ Erreur lors du tirage.')` et les commentaires `// …` " +
      "qu'ils contiennent sont la copie du BOT, pas celle du site — le bot " +
      'Gachapon est francophone, et traduire ces exemples ferait livrer au ' +
      "lecteur un bot dont les réponses ne correspondent plus à ce qu'il lit. " +
      '26 occurrences avant correction. **La prose autour reste scannée** : ' +
      "seule la valeur de l'attribut `code` est masquée, pas le fichier.",
  },
]

/**
 * Mots-clés après lesquels un `/` commence quasi certainement un littéral
 * regex plutôt qu'une division (`return /foo/`, `case /foo/:`…). Liste non
 * exhaustive — voir `canStartRegex`.
 */
const REGEX_PRECEDING_KEYWORDS = new Set([
  'return',
  'typeof',
  'instanceof',
  'in',
  'of',
  'case',
  'new',
  'delete',
  'void',
  'throw',
  'yield',
  'await',
  'do',
  'else',
])

/**
 * Heuristique « un `/` peut-il ouvrir un littéral regex ici ? », basée sur le
 * dernier caractère significatif déjà émis dans `out`. Pas un vrai lexer JS
 * (qui suivrait le type du token précédent, pas juste son dernier caractère,
 * et qui saurait qu'un mot-clé après un `.` est un nom de propriété) mais
 * suffisant pour les deux familles de cas qui comptent :
 *   - après un opérateur/une ponctuation ouvrante (`(`, `{`, `,`, `=`, `!`,
 *     `&&`, début de fichier…) → un `/` est presque toujours un regex ;
 *   - après un identifiant, un nombre, `)` ou `]` → c'est presque toujours
 *     une division, SAUF si l'identifiant est un mot-clé de
 *     `REGEX_PRECEDING_KEYWORDS` (`return /foo/`, `case /foo/:`).
 *
 * Deux limites connues, de directions opposées — la seconde a été trouvée en
 * revue (Round 2) et corrige une garantie précédemment fausse dans ce
 * commentaire ; ne pas la réintroduire sans la revérifier comme un test :
 *
 * 1. Faux négatif, sans conséquence connue : `if (x) /foo/.test(y)` (regex
 *    juste après `)`, syntaxiquement valide mais jamais écrit ainsi en
 *    pratique) est traité comme une division. `canStartRegex` renvoie
 *    `false`, `tryConsumeRegex` n'est pas appelé, le `/` est simplement
 *    recopié comme caractère normal — aucun texte n'est perdu ni mal
 *    interprété plus loin sur la ligne.
 *
 * 2. Faux positif, avec conséquence réelle : un mot de
 *    `REGEX_PRECEDING_KEYWORDS` (`in`, `of`…) utilisé comme **nom de
 *    propriété après un point** (`data.in`, `obj.of`) n'est pas distingué du
 *    même mot employé comme opérateur JS — `canStartRegex` ne regarde que le
 *    mot, jamais le caractère avant lui. Si une vraie division suit sur
 *    cette ligne ET qu'un commentaire `//` la suit à son tour, `tryConsumeRegex`
 *    peut refermer le « regex » sur le premier `/` de ce commentaire (il ne
 *    sait pas non plus ce qu'est un commentaire) : l'état retombe en `code`
 *    au lieu de `lineComment` pour le reste de la ligne, qui est alors
 *    scannée comme du texte normal — un vrai commentaire peut se faire
 *    signaler à tort. Fixture qui reproduit, vérifiée :
 *    `const rate = data.in / total // commentaire francais avec votre mot cache`
 *    → `exit=1`, `avec` et `votre` signalés dans le commentaire.
 *    Direction du risque : toujours un faux positif (un vrai commentaire
 *    scanné comme du code), jamais un faux négatif — `tryConsumeRegex` ne
 *    blanchit ni ne supprime jamais de texte, il ne fait que recopier
 *    verbatim ou abandonner (voir sa propre doc) ; ce chemin ne peut donc
 *    pas faire disparaître du français réellement en dur, seulement faire
 *    crier le script sur du texte qui n'en était pas. Garantie qui tient
 *    réellement, à la place de l'ancienne affirmation erronée « jamais de
 *    sur-consommer du code » : `tryConsumeRegex` ne franchit jamais un saut
 *    de ligne (il rend `null` dès qu'il en rencontre un), donc aucune
 *    mauvaise classification ne peut se propager au-delà de la ligne où elle
 *    démarre — mais À L'INTÉRIEUR d'une même ligne, comme ce cas le montre,
 *    elle peut bel et bien désynchroniser la détection de commentaire.
 */
function canStartRegex(out) {
  let j = out.length - 1
  while (j >= 0 && /\s/.test(out[j])) {
    j -= 1
  }
  if (j < 0) {
    return true
  }
  const ch = out[j]
  if (ch === ')' || ch === ']') {
    return false
  }
  if (/[A-Za-z0-9_$]/.test(ch)) {
    let k = j
    while (k >= 0 && /[A-Za-z0-9_$]/.test(out[k])) {
      k -= 1
    }
    const word = out.slice(k + 1, j + 1)
    return REGEX_PRECEDING_KEYWORDS.has(word)
  }
  return true
}

/**
 * Tente de consommer un littéral regex démarrant en `source[start]` (`/`).
 * Respecte les classes de caractères (`[...]`, où un `/` nu ne ferme pas le
 * littéral) et les échappements (`\/`). Un littéral regex JS ne peut pas
 * contenir de retour à la ligne non échappé : rencontrer `\n` avant la
 * fermeture signifie que ce n'était pas un regex (probablement une division
 * mal classée par `canStartRegex`) → renvoie `null`, et l'appelant retombe
 * sur le traitement caractère par caractère normal.
 *
 * Renvoie l'index (exclusif) juste après les flags (`i`, `g`, `u`…), ou
 * `null` si aucune fermeture valide n'a été trouvée sur la ligne.
 */
function tryConsumeRegex(source, start) {
  let i = start + 1
  let inCharClass = false
  while (i < source.length) {
    const c = source[i]
    if (c === '\n') {
      return null
    }
    if (c === '\\') {
      i += 2
      continue
    }
    if (c === '[') {
      inCharClass = true
      i += 1
      continue
    }
    if (c === ']') {
      inCharClass = false
      i += 1
      continue
    }
    if (c === '/' && !inCharClass) {
      i += 1
      while (i < source.length && /[A-Za-z]/.test(source[i])) {
        i += 1
      }
      return i
    }
    i += 1
  }
  return null
}

/**
 * Retire le contenu des commentaires (`//…`, `/* … *\/`, JSDoc inclus) d'une
 * source TS/TSX tout en conservant le nombre de lignes ET le contenu des
 * chaînes/template literals (c'est justement là que vit le texte à détecter).
 *
 * Tokenizer volontairement simple, pas un parseur TS complet. Deux angles
 * morts documentés plutôt que silencieusement ignorés :
 *   - **texte JSX brut hors chaîne** (ex. `<a>https://exemple.fr</a>`) : un
 *     `//` y est en état `code`, pas dans une chaîne — sans précaution il
 *     serait pris pour un début de commentaire et tout le français qui suit
 *     sur la même ligne serait blanchi sans le signaler. Round 1 de revue :
 *     un `//` immédiatement précédé de `:` (`https://`, `http://`, tout
 *     schéma `xxx://`) est désormais traité comme faisant partie d'une URL,
 *     jamais comme un commentaire — c'est le cas dominant, celui qui arrive
 *     réellement dans du texte produit. Angle mort résiduel, accepté : une
 *     URL protocol-relative SANS le `:` (`//cdn.exemple.fr`, rare hors d'une
 *     chaîne) ne serait pas reconnue. Risque inverse accepté aussi : un
 *     `//commentaire` collé sans espace directement après un `:` de code
 *     (`default://commentaire`, un `case` sans espace) serait à tort traité
 *     comme une URL et donc PAS retiré — un faux positif (le commentaire
 *     serait signalé comme français en dur) plutôt qu'un faux négatif ; ce
 *     dépôt est formaté par Biome, qui insère systématiquement un espace
 *     avant `//`, donc ce cas ne devrait pas se produire dans du code réel.
 *   - **template literals** : le TEXTE entre backticks est recopié tel quel
 *     (c'est du contenu affichable, on veut pouvoir le détecter), mais le
 *     contenu d'une INTERPOLATION `${…}` est, lui, du vrai code — et depuis
 *     la tâche 12 il repasse en état `code`, donc les commentaires qui s'y
 *     trouvent sont retirés comme partout ailleurs. Voir « LES COMMENTAIRES
 *     DANS UNE INTERPOLATION » plus bas.
 * Le troisième angle mort initial (`//` à l'intérieur d'un littéral regex,
 * `/^\/\//`) est traité via `canStartRegex`/`tryConsumeRegex` ci-dessus —
 * heuristique basée sur le dernier token, pas un vrai lexer JS, dont les
 * limites sont documentées sur `canStartRegex`.
 *
 * ---
 *
 * LES COMMENTAIRES DANS UNE INTERPOLATION (corrigé, tâche 12). Le cas réel,
 * et le seul du dépôt : `components/shared/tcg-card/TcgCardFace.tsx:354`,
 *
 *     className={`absolute … ${
 *       // Sur une vignette compacte (52 px dans le bandeau d'équipe), un
 *       // retrait de 12 px mange le quart de la largeur : on serre le coin.
 *       compact ? '…' : '…'
 *     }`}
 *
 * L'ancien tokenizer traitait tout l'intérieur des backticks comme opaque :
 * ces deux lignes de commentaire étaient scannées comme du texte affiché et
 * produisaient **4 occurrences** (« Sur », « une », « dans », un accent),
 * toutes fausses. Elles étaient documentées juste au-dessus comme un faux
 * positif assumé ; elles ne le sont plus.
 *
 * La correction : une pile de contextes. `${` dans un `template` empile le
 * contexte et repasse en `code` (avec sa propre profondeur d'accolades) ;
 * le `}` qui referme l'interpolation dépile et rend l'état `template`. Les
 * templates imbriqués dans une interpolation fonctionnent par récurrence de
 * la même pile.
 *
 * CE QUE CETTE CORRECTION NE FAIT PAS, et c'est volontaire : un `//` dans le
 * TEXTE d'un template (hors `${…}`) n'est toujours PAS traité comme un
 * commentaire — parce qu'il n'en est pas un. C'est ce qui garde le garde-fou
 * mordant sur `routes/discord.tsx`, dont les blocs de code d'exemple sont
 * des templates dont les `// …` sont du texte AFFICHÉ à l'écran (ils sont
 * couverts, eux, par une exception déclarée, pas par le tokenizer).
 *
 * Direction du risque, mesurée : le comptage d'accolades de l'état `code`
 * peut être désynchronisé par une accolade NUE dans du texte JSX brut
 * (`<p>}</p>`). Un `}` en trop est ignoré quand la profondeur est déjà à 0
 * et qu'aucune interpolation n'est ouverte ; un `{` en trop ferait rater la
 * fin d'une interpolation, donc scannerait du code comme du texte — un faux
 * POSITIF bruyant, jamais un faux négatif silencieux. Aucun cas dans ce
 * dépôt (401 fichiers, scan complet après correction).
 *
 * ---
 *
 * L'APOSTROPHE DU FRANÇAIS EN TEXTE JSX (corrigé, tâche 6 round 2). C'était
 * l'angle mort le plus grave du lot, et il invalidait une garantie écrite
 * ici même — « aucun texte n'est perdu », qui était FAUSSE. Dans
 * `<span>Retour à l'équipe</span>`, le `'` de `l'` n'ouvre pas une chaîne :
 * c'est du texte. L'ancien tokenizer entrait pourtant en état `singleQuote`
 * et n'en ressortait qu'au `'` suivant — potentiellement la fin du fichier.
 * **24 fichiers sur 401** finissaient ainsi désynchronisés. Les deux
 * directions ont été reproduites, puis mesurées :
 *
 *   - FAUX POSITIF (se produit vraiment ici) : les commentaires cessent
 *     d'être retirés, donc du français de COMMENTAIRE est signalé comme du
 *     texte en dur. 14 fichiers, 145 occurrences fantômes — dont 51 lignes
 *     dans `RaidPanel.tsx`, `DuelResultPopup.tsx`, `ContributionsTable.tsx`,
 *     toutes vérifiées une par une comme étant des lignes de commentaire.
 *   - FAUX NÉGATIF (démontré sur fixture, absent du dépôt aujourd'hui) : si
 *     une vraie chaîne `'…'` vient après, son quote OUVRANT ferme la chaîne
 *     fantôme, donc son CONTENU est lu comme du code — et un `//` qui s'y
 *     trouve déclenche un commentaire qui blanchit la fin de la ligne.
 *     Fixture vérifiée : `{cond ? 'Erreur 50//50 lors du chargement des
 *     cartes' : null}` après une ligne portant `l'accueil` ne remontait
 *     qu'UNE occurrence (« Erreur ») au lieu de SIX — cinq mots français
 *     effacés. Après correction : 6. Mesuré sur le dépôt entier, ce sens ne
 *     se matérialise nulle part aujourd'hui (0 ligne gagnée) : c'est une
 *     bombe amorcée, pas une fuite en cours.
 *
 * La correction tient en une règle, la même que `tryConsumeRegex` applique
 * déjà : **une chaîne `'…'` ou `"…"` ne peut pas contenir un saut de ligne
 * nu**, donc en rencontrer un prouve que l'état était faux — on repasse en
 * `code`. Les backticks franchissent légitimement les lignes et ne sont pas
 * touchés. Après correction, 0 fichier sur 401 termine hors de l'état
 * `code`.
 *
 * Ce que ce tokenizer garantit RÉELLEMENT, maintenant (remplace la garantie
 * fausse) : **aucune désynchronisation ne franchit une fin de ligne**, sauf
 * à l'intérieur d'un template literal, où c'est voulu. Une mauvaise
 * classification reste donc bornée à la ligne où elle démarre — elle peut y
 * faire crier le script à tort (`data.in / total // commentaire`, voir
 * `canStartRegex`) ou y blanchir la fin d'une ligne, mais elle ne peut plus
 * contaminer le reste du fichier.
 */
function stripComments(source) {
  let out = ''
  let state = 'code'
  // Pile des contextes imbriqués `template` / `${…}`. Chaque entrée mémorise
  // l'état ET la profondeur d'accolades à restaurer en sortant du niveau
  // courant. Voir la doc ci-dessus (« LES COMMENTAIRES DANS UNE
  // INTERPOLATION »).
  const stack = []
  let braceDepth = 0
  let i = 0
  const n = source.length

  while (i < n) {
    const c = source[i]
    const c2 = i + 1 < n ? source[i + 1] : ''

    if (state === 'code') {
      if (c === '/' && c2 === '/') {
        // `xxx://` — schéma d'URL, jamais un commentaire. Voir la doc de
        // stripComments pour l'angle mort résiduel (protocol-relative sans
        // `:`) et le compromis inverse assumé.
        if (i > 0 && source[i - 1] === ':') {
          out += c + c2
          i += 2
          continue
        }
        state = 'lineComment'
        out += '  '
        i += 2
        continue
      }
      if (c === '/' && c2 === '*') {
        state = 'blockComment'
        out += '  '
        i += 2
        continue
      }
      if (c === '/' && canStartRegex(out)) {
        const end = tryConsumeRegex(source, i)
        if (end !== null) {
          out += source.slice(i, end)
          i = end
          continue
        }
      }
      if (c === '{') {
        braceDepth += 1
        out += c
        i += 1
        continue
      }
      if (c === '}') {
        const top = stack[stack.length - 1]
        if (braceDepth === 0 && top !== undefined && top.state === 'template') {
          stack.pop()
          state = 'template'
          braceDepth = top.braceDepth
        } else if (braceDepth > 0) {
          braceDepth -= 1
        }
        out += c
        i += 1
        continue
      }
      if (c === "'") {
        state = 'singleQuote'
        out += c
        i += 1
        continue
      }
      if (c === '"') {
        state = 'doubleQuote'
        out += c
        i += 1
        continue
      }
      if (c === '`') {
        stack.push({ state: 'code', braceDepth })
        state = 'template'
        braceDepth = 0
        out += c
        i += 1
        continue
      }
      out += c
      i += 1
      continue
    }

    if (state === 'lineComment') {
      if (c === '\n') {
        state = 'code'
        out += '\n'
      } else {
        out += ' '
      }
      i += 1
      continue
    }

    if (state === 'blockComment') {
      if (c === '*' && c2 === '/') {
        state = 'code'
        out += '  '
        i += 2
        continue
      }
      out += c === '\n' ? '\n' : ' '
      i += 1
      continue
    }

    if (state === 'template') {
      // `${` ouvre une EXPRESSION JS : on repasse en état `code`, donc les
      // commentaires qui s'y trouvent sont retirés comme partout ailleurs.
      if (c === '$' && c2 === '{') {
        stack.push({ state: 'template', braceDepth })
        state = 'code'
        braceDepth = 0
        out += '${'
        i += 2
        continue
      }
      if (c === '\\') {
        out += c + c2
        i += 2
        continue
      }
      if (c === '`') {
        const top = stack.pop()
        state = top === undefined ? 'code' : top.state
        braceDepth = top === undefined ? 0 : top.braceDepth
        out += c
        i += 1
        continue
      }
      out += c
      i += 1
      continue
    }

    // singleQuote / doubleQuote : on recopie tel quel (c'est le texte qu'on
    // veut pouvoir détecter), en sautant correctement les échappements pour ne
    // pas fermer la chaîne trop tôt sur un `\'` etc.
    const closing = state === 'singleQuote' ? "'" : '"'

    // RESYNCHRONISATION EN FIN DE LIGNE. Une chaîne `'…'` ou `"…"` de JS ne
    // peut PAS contenir un saut de ligne nu : en rencontrer un prouve que ce
    // qui a ouvert l'état n'était pas un délimiteur de chaîne. Le cas qui
    // arrive vraiment, et massivement, c'est l'APOSTROPHE DU FRANÇAIS en
    // texte JSX brut — `<span>Retour à l'équipe</span>` — où `l'` faisait
    // entrer le tokenizer en `singleQuote` pour tout le RESTE DU FICHIER.
    // Même raisonnement que `tryConsumeRegex`, qui rend `null` sur un `\n`
    // pour la même raison. Les backticks, eux, franchissent légitimement les
    // lignes : l'état `template` n'est pas concerné (il est traité plus haut).
    if (c === '\n') {
      state = 'code'
      out += '\n'
      i += 1
      continue
    }

    if (c === '\\') {
      out += c + c2
      i += 2
      continue
    }
    if (c === closing) {
      state = 'code'
      out += c
      i += 1
      continue
    }
    out += c
    i += 1
  }

  return out
}

/**
 * Remplace une correspondance par du vide de MÊME GÉOMÉTRIE : chaque
 * caractère devient une espace, sauf les sauts de ligne, conservés tels
 * quels. Une correspondance multi-lignes (un bloc `code={`…`}`, la liste
 * `SECTION_IDS`) ne décale donc ni les numéros de ligne ni les colonnes des
 * occurrences qui restent à signaler ailleurs dans le fichier.
 */
function blank(match) {
  return match.replace(/[^\n]/g, ' ')
}

/**
 * Applique, sur la source ENTIÈRE déjà débarrassée de ses commentaires, les
 * masques structurels puis les exceptions applicables à `relPath` (chemin
 * relatif à `front/`, séparateurs `/`).
 *
 * Retourne la source masquée, à nombre de lignes et de colonnes identique.
 */
function applyMasks(source, relPath) {
  let masked = source

  for (const { pattern } of STRUCTURAL_MASKS) {
    // Un `RegExp` global partagé accumule un `lastIndex` — on le régénère à
    // chaque appel pour rester sans état entre les fichiers.
    masked = masked.replace(new RegExp(pattern.source, pattern.flags), blank)
  }

  for (const { pattern, files } of EXCEPTIONS) {
    if (files !== undefined && !files.includes(relPath)) {
      continue
    }
    masked = masked.replace(new RegExp(pattern.source, pattern.flags), blank)
  }

  return masked
}

/**
 * Contexte lisible autour d'un index de correspondance, tronqué pour rester
 * lisible en sortie de terminal.
 */
function snippet(originalLine, index, matchLength) {
  const start = Math.max(0, index - 20)
  const end = Math.min(originalLine.length, index + matchLength + 20)
  const prefix = start > 0 ? '…' : ''
  const suffix = end < originalLine.length ? '…' : ''
  return `${prefix}${originalLine.slice(start, end).trim()}${suffix}`
}

function scanLine(originalLine, maskedLine) {
  const violations = []

  ACCENT_RE.lastIndex = 0
  let m = ACCENT_RE.exec(maskedLine)
  while (m !== null) {
    violations.push({
      kind: 'accent',
      match: m[0],
      column: m.index + 1,
      context: snippet(originalLine, m.index, m[0].length),
    })
    m = ACCENT_RE.exec(maskedLine)
  }

  WORD_RE.lastIndex = 0
  m = WORD_RE.exec(maskedLine)
  while (m !== null) {
    violations.push({
      kind: 'mot',
      match: m[0],
      column: m.index + 1,
      context: snippet(originalLine, m.index, m[0].length),
    })
    m = WORD_RE.exec(maskedLine)
  }

  return violations
}

// ---------------------------------------------------------------------------
// Parcours du système de fichiers
// ---------------------------------------------------------------------------

/** `true` si `filePath` (absolu) est sous `dirPath` (absolu). */
function isUnder(filePath, dirPath) {
  const rel = path.relative(dirPath, filePath)
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))
}

/** Convertit un motif glob simple (`*`, `**`, `?`) en RegExp ancrée. */
function globToRegExp(glob) {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&')
  // Un seul passage, `**` avant `*` dans l'alternative pour matcher la plus
  // longue en premier : pas de caractère de remplacement temporaire à poser
  // puis réinjecter ensuite (une première version en utilisait un, qui a
  // fini écrite telle quelle comme octet de contrôle dans ce fichier —
  // remplacée par cette forme sans jeton intermédiaire du tout).
  const pattern = escaped.replace(/\*\*|\*|\?/g, (token) => {
    if (token === '**') {
      return '.*'
    }
    if (token === '*') {
      return '[^/]*'
    }
    return '.'
  })
  return new RegExp(`^${pattern}$`)
}

async function walk(dir, out) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      await walk(full, out)
      continue
    }
    if (entry.isFile() && SCAN_EXTENSIONS.has(path.extname(entry.name))) {
      out.push(full)
    }
  }
}

/**
 * Résout l'argument de périmètre (chemin ou motif glob simple) en liste de
 * fichiers `.ts`/`.tsx` à scanner, toujours sous `src/` et toujours hors
 * `src/i18n/locales/` (où le français en dur est le contenu attendu, pas une
 * régression) et hors `routeTree.gen.ts` (généré, jamais touché à la main).
 */
async function resolveTargets(arg) {
  const isGlob = typeof arg === 'string' && /[*?]/.test(arg)

  if (!arg) {
    const all = []
    await walk(SRC_ROOT, all)
    return all
  }

  if (isGlob) {
    const absoluteGlob = path.isAbsolute(arg) ? arg : path.join(FRONT_ROOT, arg)
    const regex = globToRegExp(absoluteGlob)
    const all = []
    await walk(SRC_ROOT, all)
    return all.filter((f) => regex.test(f))
  }

  const target = path.isAbsolute(arg) ? arg : path.join(FRONT_ROOT, arg)
  const st = await fs.stat(target).catch(() => null)
  if (!st) {
    console.error(`[check-i18n-hardcoded] chemin introuvable : ${target}`)
    process.exit(1)
  }
  if (st.isFile()) {
    return SCAN_EXTENSIONS.has(path.extname(target)) ? [target] : []
  }
  const all = []
  await walk(target, all)
  return all
}

async function main() {
  const args = process.argv.slice(2)
  const collected = new Set()
  if (args.length === 0) {
    for (const f of await resolveTargets(undefined)) {
      collected.add(f)
    }
  } else {
    for (const arg of args) {
      for (const f of await resolveTargets(arg)) {
        collected.add(f)
      }
    }
  }
  const targets = [...collected].filter(
    (f) => !isUnder(f, LOCALES_DIR) && path.basename(f) !== 'routeTree.gen.ts',
  )

  let violationCount = 0
  let filesWithViolations = 0

  for (const file of targets.sort()) {
    const rel = path.relative(FRONT_ROOT, file).split(path.sep).join('/')
    const source = await fs.readFile(file, 'utf8')
    const stripped = applyMasks(stripComments(source), rel)
    const originalLines = source.split('\n')
    const strippedLines = stripped.split('\n')

    let fileHasViolation = false

    for (let i = 0; i < strippedLines.length; i++) {
      const violations = scanLine(
        originalLines[i] ?? '',
        strippedLines[i] ?? '',
      )
      for (const v of violations) {
        if (!fileHasViolation) {
          fileHasViolation = true
        }
        violationCount++
        console.error(
          `${rel}:${i + 1}:${v.column}: ${v.kind === 'accent' ? 'caractère accentué' : `mot français "${v.match}"`} — ${v.context}`,
        )
      }
    }

    if (fileHasViolation) {
      filesWithViolations++
    }
  }

  if (violationCount > 0) {
    console.error(
      `\n[check-i18n-hardcoded] ${violationCount} occurrence(s) de français en dur dans ${filesWithViolations} fichier(s) (périmètre : ${targets.length} fichier(s) scanné(s)).`,
    )
    process.exitCode = 1
    return
  }

  console.log(
    `[check-i18n-hardcoded] OK — aucune chaîne française en dur (${targets.length} fichier(s) scanné(s)).`,
  )
}

main().catch((err) => {
  console.error('[check-i18n-hardcoded] échec inattendu :', err)
  process.exit(1)
})
