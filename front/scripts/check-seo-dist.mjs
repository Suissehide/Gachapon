#!/usr/bin/env node
// Garde-fou des fichiers produits par prerender-seo.mjs — lot 3.
//
// Lance `node scripts/check-seo-dist.mjs` après un build (c'est ce que fait le
// `postbuild`). Sort en 1 et liste chaque violation dès qu'un invariant du
// SEO bilingue est rompu dans `dist/`.
//
// POURQUOI UN SCRIPT ET PAS UNE RELECTURE À L'ŒIL : les invariants vérifiés
// ici sont des invariants CROISÉS (le href annoncé par /fr/guide doit être le
// canonical réellement écrit dans /en/guide). Sur 14 fichiers, un humain qui
// les relit un par un ne peut pas les voir ; une réciprocité cassée ne produit
// aucun symptôme visible, juste une désindexation silencieuse des deux pages
// quelques semaines plus tard.
//
// CE QU'IL VÉRIFIE
//   1. les 14 fichiers attendus existent (7 routes x 2 langues) ;
//   2. `dist/index.html` est resté le fallback SPA : ni #seo-static, ni
//      canonical de route, #root vide, et AUCUNE balise d'identité (canonical,
//      og:url) — le gabarit les a perdues, un fallback servi pour des URLs
//      variables ne peut pas en déclarer ;
//   3. par fichier : <html lang>, un et un seul canonical, égal à
//      ORIGIN + /<langue><route> ;
//   4. par fichier : exactement 3 alternates (fr, en, x-default), x-default
//      égal au href annoncé pour la langue par défaut — ET pointant bien sur
//      la langue par défaut, pas seulement sur « une » des deux ;
//   5. RÉCIPROCITÉ : le href que /fr/X annonce pour `en` est exactement le
//      canonical écrit dans le fichier /en/X, et inversement ;
//   6. title / description / og:* / twitter:* / og:locale / JSON-LD
//      inLanguage correspondent à la langue du fichier ;
//   7. le bloc #seo-static existe quand la route en déclare un, son <h1> est
//      le `heading` de la bonne langue, et tous ses liens internes portent le
//      préfixe de langue du fichier ;
//   8. aucun texte de l'AUTRE langue dans un fichier (titre, lead, heading) ;
//   9. l'ancien domaine n'apparaît nulle part dans dist/ ;
//  10. sitemap : 14 <url>, chaque loc = un canonical existant, chaque url
//      portant ses 3 alternates ; robots.txt pointant sur ORIGIN ;
//  11. le fragment nginx couvre chaque route non racine, dans les deux
//      formes (`/guide` et `/guide/`), et vise bien /fr.
//
// SES ANGLES MORTS, MESURÉS
//   a. Il compare le HTML produit à `SEO_ROUTES`, sa propre source. Il ne peut
//      donc PAS voir qu'un texte anglais de seo-routes.mjs diverge de
//      src/i18n/locales/en/*.json : un contresens de traduction passe. Le
//      contrôle de cet accord-là n'existe pas et reste humain (voir le rapport
//      du lot 3). Portée réelle : les 4 champs par route et par langue
//      (navLabel, title, description, staticBlock) sont vérifiés présents et
//      au bon endroit, jamais vérifiés justes.
//   b. Il ne vérifie pas que `#seo-static` reprend le contenu de la page
//      React : aucun des deux n'est exécuté ici. Même limite que le commentaire
//      d'en-tête de seo-routes.mjs, qui repose sur la discipline.
//   c. Il lit `SEO_LOCALES` et `DEFAULT_SEO_LOCALE` de seo-routes.mjs, pas
//      `SUPPORTED_LOCALES`/`DEFAULT_LOCALE` de src/i18n/index.ts (un .ts, non
//      lisible par Node sans transpilation). Il compare donc les deux listes
//      par lecture textuelle du fichier i18n (invariant 0) : une réécriture de
//      src/i18n/index.ts qui changerait la forme de ces déclarations rendrait
//      cette comparaison muette — elle échoue alors, elle ne passe pas en
//      silence.
//   d. Il ne teste AUCUN comportement nginx : ni la 302 sur `/`, ni l'ordre
//      des `location`, ni le X-Robots-Tag. Il lit un fragment de texte. Ce qui
//      se passe réellement dans le conteneur doit être testé dans le
//      conteneur.
//   e. Il ne rend aucune page : un `#seo-static` syntaxiquement correct mais
//      illisible (balises imbriquées à tort) passerait.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { FAQ_ITEMS } from './faq-items.mjs'
import {
  DEFAULT_SEO_LOCALE,
  LEGACY_LOCALE,
  SEO_LOCALES,
  SEO_ROUTES,
  SITE_META,
  SITE_ORIGIN as DEFAULT_ORIGIN,
} from './seo-routes.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FRONT_ROOT = path.resolve(__dirname, '..')
const DIST_DIR = path.join(FRONT_ROOT, 'dist')
const NGINX_FRAGMENT = path.join(
  FRONT_ROOT,
  'dist-nginx',
  'seo-legacy-redirects.conf',
)
const I18N_INDEX = path.join(FRONT_ROOT, 'src', 'i18n', 'index.ts')

const ORIGIN = (process.env.SITE_ORIGIN ?? DEFAULT_ORIGIN).replace(/\/+$/, '')
const LEGACY_HOST = 'gachapon.qwetle.fr'

const problems = []
let checks = 0

function check(ok, message) {
  checks++
  if (!ok) {
    problems.push(message)
  }
}

/**
 * Échappement HTML réimplémenté plutôt qu'importé de prerender-seo.mjs :
 * un contrôle qui emprunte l'échappement du producteur est aveugle aux bugs
 * de cet échappement — il comparerait une erreur à elle-même.
 */
function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function localizedPath(locale, routePath) {
  return routePath === '/' ? `/${locale}` : `/${locale}${routePath}`
}

function distFile(locale, routePath) {
  return path.join(
    DIST_DIR,
    localizedPath(locale, routePath).replace(/^\//, ''),
    'index.html',
  )
}

function attr(html, regex) {
  const matches = [...html.matchAll(regex)]
  return matches.map((m) => m[1])
}

/**
 * `undefined` si une seule langue est déclarée — le contrôle « aucun texte de
 * l'autre langue » n'a alors plus d'objet et se saute, plutôt que de lever.
 */
const otherLocale = (locale) => SEO_LOCALES.find((l) => l !== locale)

// ---------------------------------------------------------------------------
// 0. Les deux listes de langues (scripts/ et src/i18n/) doivent concorder
// ---------------------------------------------------------------------------

async function checkLocalesMatchI18n() {
  const src = await fs.readFile(I18N_INDEX, 'utf8')

  const supported = src.match(
    /export const SUPPORTED_LOCALES = \[([^\]]*)\] as const/,
  )
  check(
    supported !== null,
    `src/i18n/index.ts : SUPPORTED_LOCALES introuvable sous la forme attendue (angle mort c)`,
  )
  if (supported) {
    const parsed = [...supported[1].matchAll(/'([a-z-]+)'/g)].map((m) => m[1])
    check(
      parsed.join(',') === [...SEO_LOCALES].sort().join(',') ||
        parsed.slice().sort().join(',') === [...SEO_LOCALES].sort().join(','),
      `SEO_LOCALES (${SEO_LOCALES.join(',')}) ≠ SUPPORTED_LOCALES (${parsed.join(',')})`,
    )
  }

  const def = src.match(/export const DEFAULT_LOCALE: Locale = '([a-z-]+)'/)
  check(
    def !== null,
    'src/i18n/index.ts : DEFAULT_LOCALE introuvable sous la forme attendue (angle mort c)',
  )
  if (def) {
    check(
      def[1] === DEFAULT_SEO_LOCALE,
      `DEFAULT_SEO_LOCALE (${DEFAULT_SEO_LOCALE}) ≠ DEFAULT_LOCALE (${def[1]})`,
    )
  }
}

// ---------------------------------------------------------------------------
// 1-8. Les fichiers prérendus
// ---------------------------------------------------------------------------

/** canonical réellement écrit dans chaque fichier, indexé par `loc|path`. */
const canonicals = new Map()

async function readAll() {
  const files = new Map()
  for (const locale of SEO_LOCALES) {
    for (const route of SEO_ROUTES) {
      const file = distFile(locale, route.path)
      try {
        files.set(`${locale}|${route.path}`, await fs.readFile(file, 'utf8'))
      } catch {
        problems.push(`fichier manquant : ${path.relative(FRONT_ROOT, file)}`)
        checks++
      }
    }
  }
  return files
}

function checkOneFile(html, route, locale) {
  const at = `${localizedPath(locale, route.path)}`
  const meta = SITE_META[locale]
  const expectedUrl = `${ORIGIN}${localizedPath(locale, route.path)}`

  // 3. <html lang> + canonical unique
  check(
    new RegExp(`<html lang="${meta.htmlLang}">`).test(html),
    `${at} : <html lang> attendu "${meta.htmlLang}"`,
  )
  const canonical = attr(html, /<link\s+rel="canonical"\s+href="([^"]*)"/g)
  check(canonical.length === 1, `${at} : ${canonical.length} canonical (1 attendu)`)
  check(
    canonical[0] === expectedUrl,
    `${at} : canonical "${canonical[0]}" ≠ "${expectedUrl}"`,
  )
  canonicals.set(`${locale}|${route.path}`, canonical[0])

  // 4. alternates
  const alternates = [
    ...html.matchAll(
      /<link\s+rel="alternate"\s+hreflang="([^"]*)"\s+href="([^"]*)"\s*\/>/g,
    ),
  ].map((m) => ({ hreflang: m[1], href: m[2] }))
  check(
    alternates.length === SEO_LOCALES.length + 1,
    `${at} : ${alternates.length} alternate(s), ${SEO_LOCALES.length + 1} attendu(s)`,
  )
  const byLang = new Map(alternates.map((a) => [a.hreflang, a.href]))
  for (const l of SEO_LOCALES) {
    check(byLang.has(l), `${at} : alternate hreflang="${l}" absent`)
  }
  check(byLang.has('x-default'), `${at} : alternate hreflang="x-default" absent`)
  check(
    byLang.get('x-default') === byLang.get(DEFAULT_SEO_LOCALE),
    `${at} : x-default "${byLang.get('x-default')}" ≠ hreflang="${DEFAULT_SEO_LOCALE}" "${byLang.get(DEFAULT_SEO_LOCALE)}"`,
  )
  // Redondant en apparence avec la ligne ci-dessus — il ne l'est pas : si les
  // DEUX basculaient sur l'autre langue, l'égalité tiendrait encore. Cette
  // ligne ancre la valeur attendue, l'autre ancre la cohérence interne.
  check(
    byLang.get('x-default') ===
      `${ORIGIN}${localizedPath(DEFAULT_SEO_LOCALE, route.path)}`,
    `${at} : x-default "${byLang.get('x-default')}" ne désigne pas la langue par défaut (${DEFAULT_SEO_LOCALE})`,
  )
  check(
    byLang.get(locale) === expectedUrl,
    `${at} : l'auto-référence hreflang="${locale}" vaut "${byLang.get(locale)}" et non le canonical "${expectedUrl}"`,
  )

  // 6. métadonnées textuelles
  const title = escapeHtml(route.title[locale])
  const desc = escapeHtml(route.description[locale])
  check(
    html.includes(`<title>${title}</title>`),
    `${at} : <title> attendu "${title}"`,
  )
  for (const [label, re, expected] of [
    ['description', /<meta\s+name="description"\s+content="([^"]*)"/g, desc],
    ['og:title', /<meta\s+property="og:title"\s+content="([^"]*)"/g, title],
    [
      'og:description',
      /<meta\s+property="og:description"\s+content="([^"]*)"/g,
      desc,
    ],
    ['og:url', /<meta\s+property="og:url"\s+content="([^"]*)"/g, expectedUrl],
    [
      'og:locale',
      /<meta\s+property="og:locale"\s+content="([^"]*)"/g,
      meta.ogLocale,
    ],
    ['twitter:title', /<meta\s+name="twitter:title"\s+content="([^"]*)"/g, title],
    [
      'twitter:description',
      /<meta\s+name="twitter:description"\s+content="([^"]*)"/g,
      desc,
    ],
  ]) {
    const found = attr(html, re)
    check(found.length === 1, `${at} : ${found.length} balise ${label} (1 attendue)`)
    check(
      found[0] === expected,
      `${at} : ${label} = "${found[0]}" ≠ "${expected}"`,
    )
  }

  const jsonld = html.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
  )
  check(jsonld !== null, `${at} : bloc JSON-LD absent`)
  if (jsonld) {
    let data = null
    try {
      data = JSON.parse(jsonld[1])
    } catch (err) {
      check(false, `${at} : JSON-LD illisible (${err.message})`)
    }
    if (data) {
      const langs = (data['@graph'] ?? [])
        .filter((n) => n.inLanguage)
        .map((n) => n.inLanguage)
      check(langs.length > 0, `${at} : aucun inLanguage dans le JSON-LD`)
      check(
        langs.every((l) => l === meta.inLanguage),
        `${at} : JSON-LD inLanguage ${JSON.stringify(langs)} ≠ "${meta.inLanguage}"`,
      )
    }
  }

  // 7. bloc statique
  const block = html.match(
    /<div id="seo-static"[\s\S]*?<\/div><!--\/seo-static-->/,
  )
  if (!route.staticBlock) {
    check(block === null, `${at} : #seo-static présent sans staticBlock déclaré`)
    return
  }
  check(block !== null, `${at} : #seo-static absent`)
  if (!block) {
    return
  }
  const body = block[0]
  check(
    body.includes(`>${escapeHtml(route.staticBlock.heading[locale])}</h1>`),
    `${at} : <h1> du bloc statique ≠ heading[${locale}]`,
  )
  check(
    body.includes(escapeHtml(route.staticBlock.lead[locale])),
    `${at} : lead[${locale}] absent du bloc statique`,
  )

  const hrefs = attr(body, /<a href="([^"]*)"/g)
  const expectedLinks =
    route.staticBlock.nav === false ? 0 : SEO_ROUTES.length - 1
  check(
    hrefs.length === expectedLinks,
    `${at} : ${hrefs.length} lien(s) interne(s), ${expectedLinks} attendu(s)`,
  )
  for (const href of hrefs) {
    check(
      href === `/${locale}` || href.startsWith(`/${locale}/`),
      `${at} : lien interne "${href}" sans préfixe de langue "${locale}"`,
    )
    check(
      href !== localizedPath(locale, route.path),
      `${at} : lien interne vers la page elle-même`,
    )
  }

  if (route.staticBlock.faq) {
    for (const item of FAQ_ITEMS) {
      check(
        body.includes(escapeHtml(item.q[locale])),
        `${at} : question de FAQ "${item.q[locale]}" absente`,
      )
    }
  }

  // 8. aucun texte de l'autre langue
  const other = otherLocale(locale)
  if (other === undefined) {
    return
  }
  for (const [label, field] of [
    ['title', route.title],
    ['heading', route.staticBlock.heading],
    ['lead', route.staticBlock.lead],
  ]) {
    if (field[other] === field[locale]) {
      continue // identité légitime (« Changelog », « Collection »…)
    }
    check(
      !html.includes(escapeHtml(field[other])),
      `${at} : le ${label} en "${other}" apparaît dans le fichier "${locale}"`,
    )
  }
}

// ---------------------------------------------------------------------------

/** Sortie immédiate : tout le reste du fichier lit `problems` puis s'arrête. */
function bail() {
  console.error(
    `[check-seo-dist] ÉCHEC — ${problems.length} violation(s) sur ${checks} contrôle(s) :`,
  )
  for (const problem of problems) {
    console.error(`  ✗ ${problem}`)
  }
  process.exit(1)
}

async function main() {
  // En premier et bloquant : tous les contrôles suivants indexent par langue.
  // Si les deux listes de langues divergent, ils partiraient en vrille (accès
  // à une locale inexistante) au lieu de nommer la vraie cause.
  await checkLocalesMatchI18n()
  if (problems.length > 0) {
    bail()
  }

  const files = await readAll()
  for (const locale of SEO_LOCALES) {
    for (const route of SEO_ROUTES) {
      const html = files.get(`${locale}|${route.path}`)
      if (html) {
        checkOneFile(html, route, locale)
      }
    }
  }

  // 5. réciprocité croisée
  for (const locale of SEO_LOCALES) {
    for (const route of SEO_ROUTES) {
      const html = files.get(`${locale}|${route.path}`)
      if (!html) {
        continue
      }
      const byLang = new Map(
        [
          ...html.matchAll(
            /<link\s+rel="alternate"\s+hreflang="([^"]*)"\s+href="([^"]*)"\s*\/>/g,
          ),
        ].map((m) => [m[1], m[2]]),
      )
      for (const target of SEO_LOCALES) {
        const announced = byLang.get(target)
        const actual = canonicals.get(`${target}|${route.path}`)
        check(
          announced !== undefined && announced === actual,
          `réciprocité rompue : ${localizedPath(locale, route.path)} annonce hreflang="${target}" → "${announced}", mais ${localizedPath(target, route.path)} porte le canonical "${actual}"`,
        )
      }
    }
  }

  // 2. le fallback SPA
  const fallback = await fs.readFile(path.join(DIST_DIR, 'index.html'), 'utf8')
  check(
    !fallback.includes('id="seo-static"'),
    'dist/index.html : #seo-static présent — ce fichier doit rester le fallback SPA',
  )
  check(
    fallback.includes('<div id="root"></div>'),
    'dist/index.html : #root non vide ou absent — src/main.tsx ne monterait plus',
  )
  for (const route of SEO_ROUTES) {
    for (const locale of SEO_LOCALES) {
      check(
        !fallback.includes(`href="${ORIGIN}${localizedPath(locale, route.path)}"`),
        `dist/index.html : canonical de route (${localizedPath(locale, route.path)}) — le fallback ne doit canonicaliser aucune page`,
      )
    }
  }
  // Ni canonical ni og:url DU TOUT, pas seulement « pas ceux d'une route » :
  // le fallback est servi pour des URLs variables (routes applicatives), donc
  // toute identité qu'il déclarerait serait fausse pour la plupart d'entre
  // elles. `/` en particulier répond désormais en 302.
  for (const [label, re] of [
    ['canonical', /<link\s+rel="canonical"/g],
    ['og:url', /<meta\s+property="og:url"/g],
  ]) {
    check(
      attr(fallback, re).length === 0,
      `dist/index.html : balise ${label} présente — le fallback ne déclare aucune identité`,
    )
  }

  // 9. l'ancien domaine
  const strays = []
  async function walk(dir) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(full)
      } else if (/\.(html|xml|txt|json|webmanifest)$/.test(entry.name)) {
        const content = await fs.readFile(full, 'utf8')
        if (content.includes(LEGACY_HOST)) {
          strays.push(path.relative(FRONT_ROOT, full))
        }
      }
    }
  }
  await walk(DIST_DIR)
  check(
    strays.length === 0,
    `ancien domaine ${LEGACY_HOST} encore présent dans : ${strays.join(', ')}`,
  )

  // 10. sitemap + robots
  const sitemap = await fs.readFile(path.join(DIST_DIR, 'sitemap.xml'), 'utf8')
  const urlBlocks = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(
    (m) => m[1],
  )
  const expectedUrls = SEO_ROUTES.length * SEO_LOCALES.length
  check(
    urlBlocks.length === expectedUrls,
    `sitemap.xml : ${urlBlocks.length} <url>, ${expectedUrls} attendues`,
  )
  check(
    sitemap.includes('xmlns:xhtml="http://www.w3.org/1999/xhtml"'),
    'sitemap.xml : espace de noms xhtml absent — les <xhtml:link> seraient invalides',
  )
  const totalAlternates = [
    ...sitemap.matchAll(/<xhtml:link rel="alternate"/g),
  ].length
  const expectedAlternates = expectedUrls * (SEO_LOCALES.length + 1)
  check(
    totalAlternates === expectedAlternates,
    `sitemap.xml : ${totalAlternates} <xhtml:link> au total, ${expectedAlternates} attendus — un sitemap qui liste les deux langues SANS alternates dit à Google « contenu dupliqué »`,
  )

  const seenLocs = new Set()
  for (const block of urlBlocks) {
    const locMatch = block.match(/<loc>([^<]*)<\/loc>/)
    check(locMatch !== null, 'sitemap.xml : <url> sans <loc>')
    if (!locMatch) {
      continue
    }
    seenLocs.add(locMatch[1])
    const alts = [
      ...block.matchAll(/<xhtml:link rel="alternate" hreflang="([^"]*)"/g),
    ].map((m) => m[1])
    check(
      alts.length === SEO_LOCALES.length + 1,
      `sitemap.xml : ${locMatch[1]} porte ${alts.length} alternate(s), ${SEO_LOCALES.length + 1} attendu(s)`,
    )
  }
  for (const canonical of canonicals.values()) {
    check(
      seenLocs.has(canonical),
      `sitemap.xml : ${canonical} absent alors qu'un fichier le canonicalise`,
    )
  }

  const robots = await fs.readFile(path.join(DIST_DIR, 'robots.txt'), 'utf8')
  check(
    robots.includes(`Sitemap: ${ORIGIN}/sitemap.xml`),
    `robots.txt : ligne Sitemap absente ou pointant ailleurs que ${ORIGIN}`,
  )

  // 11. fragment nginx
  const fragment = await fs.readFile(NGINX_FRAGMENT, 'utf8')
  for (const route of SEO_ROUTES) {
    if (route.path === '/') {
      check(
        !new RegExp(`location = / \\{`).test(fragment),
        'fragment nginx : une 301 sur / — c\'est la 302 par Accept-Language qui doit la servir',
      )
      continue
    }
    const target = `/${LEGACY_LOCALE}${route.path}$is_args$args`
    for (const form of [route.path, `${route.path}/`]) {
      check(
        fragment.includes(`location = ${form} { return 301 ${target}; }`),
        `fragment nginx : 301 manquante pour ${form} → ${target}`,
      )
    }
  }

  if (problems.length > 0) {
    bail()
  }

  console.log(
    `[check-seo-dist] OK — ${checks} contrôle(s) sur ${SEO_ROUTES.length} route(s) × ${SEO_LOCALES.length} langue(s) ` +
      `(${SEO_ROUTES.length * SEO_LOCALES.length} fichiers prérendus + sitemap + robots + fragment nginx), origine ${ORIGIN}.`,
  )
}

main().catch((err) => {
  console.error('[check-seo-dist] failed:', err)
  process.exit(1)
})
