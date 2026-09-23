#!/usr/bin/env node
// Lightweight SEO prerender — runs after `vite build`.
//
// Why this exists:
//   The app is a single-page React app. The static index.html shipped by Vite
//   has only the generic landing meta tags; per-route titles/descriptions are
//   injected at runtime via react-helmet-async. Googlebot *does* render JS,
//   but it does so with reduced priority and frequency, which leads to pages
//   being flagged "Explorée, actuellement non indexée".
//
// What it does (lot 3 — bilingue):
//   For each route declared in `seo-routes.mjs` AND each locale of
//   `SEO_LOCALES`, it writes `dist/<locale>/<route>/index.html` with the right
//   <html lang>, <title>, description, canonical, OpenGraph/Twitter tags,
//   `hreflang` alternates and a `#seo-static` body block in that language,
//   carrying the page's real copy and the links to the other public routes.
//   It also emits `dist/sitemap.xml` (both languages, each URL carrying its
//   alternates), `dist/robots.txt`, and `dist-nginx/seo-legacy-redirects.conf`
//   — les 301 des anciennes URLs sans préfixe, dérivées de la même table que
//   le sitemap pour qu'aucune liste ne soit tenue à la main.
//
// Why two trees rather than one:
//   nginx fait `try_files $uri $uri/index.html /index.html`. Avant le lot 3,
//   `dist/guide/index.html` existait mais `/fr/guide` et `/en/guide` ne
//   trouvaient aucun fichier et retombaient sur `dist/index.html` : le titre,
//   la description et le canonical de l'accueil étaient servis pour TOUTES
//   les pages, dans les deux langues.
//
// Why `dist/index.html` is no longer overwritten:
//   Il n'y a plus de page à la racine (`/` part en 302 vers `/fr` ou `/en`,
//   voir deploy/conf/nginx.conf). `dist/index.html` redevient le simple
//   fallback SPA ; il reçoit seulement la réécriture d'origine, pour que
//   og:image, le JSON-LD et le `data-domains` d'Umami suivent SITE_ORIGIN.
//
// Why the body block matters as much as the meta tags:
//   Without it nginx serves a <body> that contains nothing but an empty
//   #root — no text to judge, and no <a href> at all, so Search Console
//   reports zero internal links and treats every URL as an orphan.
//
// What it doesn't do:
//   It does NOT execute the React app. We don't want a headless browser in
//   the build pipeline. The real page still hydrates client-side, and
//   `src/main.tsx` drops #seo-static on mount — the static copy is a
//   crawler-facing stand-in, never a second rendering of the app.
//
//   It does NOT check its own output: c'est le rôle de
//   `scripts/check-seo-dist.mjs`, lancé juste après par le `postbuild`.
//
// Usage:
//   `npm run build` (wired via the `postbuild` hook in package.json).

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
const DIST_DIR = path.resolve(__dirname, '../dist')
/**
 * Fragment de configuration nginx, écrit HORS de `dist/` : tout ce qui est
 * sous `dist/` finit dans la racine web du conteneur (voir
 * front/deploy/Dockerfile), et un `.conf` servi en téléchargement n'a rien à
 * y faire. Le Dockerfile le copie dans /etc/nginx/snippets/, que
 * deploy/conf/nginx.conf inclut par joker.
 */
const NGINX_DIR = path.resolve(__dirname, '../dist-nginx')

/**
 * Origine publique du site, surchargeable au build par la variable SITE_ORIGIN.
 *
 * Paramétrable plutôt qu'en dur parce qu'un changement de domaine doit être
 * atomique avec la bascule DNS : tant que la variable n'est pas posée, tout
 * continue de pointer vers DEFAULT_ORIGIN. Un canonical qui désigne un domaine
 * qui ne résout pas encore est bien pire que pas de canonical du tout.
 *
 * Reste dans ce script et non dans seo-routes.mjs : ce dernier est aussi
 * importé par SeoHead.tsx, donc embarqué dans le bundle navigateur, où
 * `process.env` n'existe pas.
 */
const ORIGIN = (process.env.SITE_ORIGIN ?? DEFAULT_ORIGIN).replace(/\/+$/, '')
const DEFAULT_HOST = new URL(DEFAULT_ORIGIN).host
const HOST = new URL(ORIGIN).host

/**
 * Réécrit les URL absolues que patchHtml ne cible pas nommément : og:image,
 * twitter:image, le bloc JSON-LD et le `data-domains` d'Umami (qui cesse
 * d'enregistrer si l'hôte ne correspond pas). Remplacement global plutôt que
 * balise par balise, pour couvrir aussi ce qu'on ajoutera plus tard dans
 * index.html.
 *
 * L'origine complète d'abord, l'hôte nu ensuite. `umami.qwetle.fr` n'est pas
 * touché : ce n'est pas la même chaîne que l'hôte du site.
 */
function rewriteOrigin(html) {
  if (ORIGIN === DEFAULT_ORIGIN) {
    return html
  }
  return html.split(DEFAULT_ORIGIN).join(ORIGIN).split(DEFAULT_HOST).join(HOST)
}

// ---------------------------------------------------------------------------
// Champs bilingues
// ---------------------------------------------------------------------------

/**
 * Lit un champ `{ fr, en }` de seo-routes.mjs, en échouant BRUYAMMENT si la
 * langue demandée manque ou est vide.
 *
 * Le repli silencieux sur l'autre langue est précisément ce qu'il ne faut pas
 * faire ici : il produirait une page `/en/...` au titre français, canonical
 * anglais et `hreflang` réciproques — c'est-à-dire exactement le duplicate
 * content que tout ce chantier cherche à éviter, mais sans aucun symptôme
 * visible. Mieux vaut casser le build. Même politique que le texte de code
 * côté front (spec §3 : « aucun repli »).
 */
function loc(field, locale, where) {
  if (field === null || typeof field !== 'object') {
    throw new Error(
      `[prerender-seo] ${where} : champ bilingue attendu ({ fr, en }), reçu ${JSON.stringify(field)}`,
    )
  }
  const value = field[locale]
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(
      `[prerender-seo] ${where} : traduction "${locale}" manquante ou vide`,
    )
  }
  return value
}

/**
 * Parcourt toute la table AVANT d'écrire quoi que ce soit, pour que le build
 * échoue sur la première traduction manquante plutôt qu'à mi-chemin, en
 * laissant un `dist/` moitié patché moitié périmé.
 */
function assertLocalized() {
  for (const route of SEO_ROUTES) {
    for (const locale of SEO_LOCALES) {
      const at = `${route.path} [${locale}]`
      loc(route.navLabel, locale, `${at} navLabel`)
      loc(route.title, locale, `${at} title`)
      loc(route.description, locale, `${at} description`)

      const block = route.staticBlock
      if (!block) {
        continue
      }
      loc(block.heading, locale, `${at} staticBlock.heading`)
      loc(block.lead, locale, `${at} staticBlock.lead`)

      for (const [i, section] of (block.sections ?? []).entries()) {
        loc(section.h, locale, `${at} sections[${i}].h`)
        if (section.items) {
          for (const [k, item] of section.items.entries()) {
            loc(item, locale, `${at} sections[${i}].items[${k}]`)
          }
        } else {
          loc(section.p, locale, `${at} sections[${i}].p`)
        }
      }

      if (block.faq) {
        for (const [i, item] of FAQ_ITEMS.entries()) {
          loc(item.q, locale, `${at} FAQ_ITEMS[${i}].q`)
          loc(item.a, locale, `${at} FAQ_ITEMS[${i}].a`)
        }
      }
    }
  }
}

/** `/fr/guide`, `/en` pour l'accueil — jamais de double slash ni de slash final. */
function localizedPath(locale, routePath) {
  return routePath === '/' ? `/${locale}` : `/${locale}${routePath}`
}

// ---------------------------------------------------------------------------
// HTML
// ---------------------------------------------------------------------------

/**
 * Replace, or insert before </head>, a tag matching `matcher`.
 * Idempotent: re-running on an already-patched HTML doesn't duplicate tags.
 */
function upsertTag(html, matcher, replacement) {
  if (matcher.test(html)) {
    return html.replace(matcher, replacement)
  }
  return html.replace('</head>', `    ${replacement}\n  </head>`)
}

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

const ROOT_DIV = '<div id="root"></div>'
const STATIC_BLOCK_RE = /<div id="seo-static"[\s\S]*?<\/div><!--\/seo-static-->/
const ALTERNATE_RE = /\s*<link\s+rel="alternate"[^>]*>/g
const JSONLD_RE =
  /<script type="application\/ld\+json">([\s\S]*?)<\/script>/

/**
 * Liens vers les autres routes publiques, dans la langue du fichier.
 *
 * La navigation de l'app est rendue par React : sans ces ancres, le HTML servi
 * ne contient aucun <a href> et Google n'a aucun chemin d'une page à l'autre.
 * La route courante est omise — un lien vers soi-même n'apporte rien.
 *
 * Les href portent le préfixe de langue : un lien `/guide` depuis `/en/about`
 * enverrait Googlebot sur une 301 vers `/fr/guide`, c'est-à-dire ferait du
 * maillage interne anglais un pont vers le site français.
 */
function renderNav(currentPath, locale) {
  const links = SEO_ROUTES.filter((r) => r.path !== currentPath)
    .map(
      (r) =>
        `<a href="${localizedPath(locale, r.path)}" style="color:inherit">${escapeHtml(loc(r.navLabel, locale, `${r.path} navLabel`))}</a>`,
    )
    .join(' · ')

  return (
    `<nav aria-label="${escapeHtml(SITE_META[locale].navAriaLabel)}" style="margin-top:3rem;padding-top:1.5rem;border-top:1px solid rgba(128,128,128,.25);font-size:.9rem;opacity:.75">` +
    links +
    '</nav>'
  )
}

function renderSection(section, locale, where) {
  const heading = `<h2 style="font-size:1.05rem;margin:1.75rem 0 .5rem">${escapeHtml(loc(section.h, locale, `${where}.h`))}</h2>`

  if (section.items) {
    return (
      heading +
      '<ul style="margin:0;padding-left:1.25rem;opacity:.8">' +
      section.items
        .map(
          (item, i) =>
            `<li style="margin:.2rem 0">${escapeHtml(loc(item, locale, `${where}.items[${i}]`))}</li>`,
        )
        .join('') +
      '</ul>'
    )
  }

  return `${heading}<p style="margin:0;opacity:.8">${escapeHtml(loc(section.p, locale, `${where}.p`))}</p>`
}

/**
 * Contenu lisible sans exécuter le JS.
 *
 * Émis en frère de #root, jamais dedans : `src/main.tsx` ne monte l'app que si
 * #root est vide, donc y placer du contenu l'empêcherait de démarrer.
 *
 * Volontairement pas `hidden` — Google dévalue le texte masqué. D'où les
 * styles inline : le bloc reste visible le temps que le JS démarre.
 */
function renderStaticBlock(route, locale) {
  const block = route.staticBlock
  const where = `${route.path} [${locale}]`

  const sections = (block.sections ?? [])
    .map((section, i) => renderSection(section, locale, `${where} sections[${i}]`))
    .join('')

  const faq = block.faq
    ? FAQ_ITEMS.map(
        (item, i) =>
          `<h2 style="font-size:1.05rem;margin:1.5rem 0 .35rem">${escapeHtml(loc(item.q, locale, `${where} FAQ[${i}].q`))}</h2>` +
          `<p style="margin:0;opacity:.75">${escapeHtml(loc(item.a, locale, `${where} FAQ[${i}].a`))}</p>`,
      ).join('')
    : ''

  const nav = block.nav === false ? '' : renderNav(route.path, locale)

  return (
    '<div id="seo-static" style="max-width:44rem;margin:0 auto;padding:4rem 1.5rem;line-height:1.6">' +
    `<h1 style="font-size:2rem;margin:0 0 1rem">${escapeHtml(loc(block.heading, locale, `${where} heading`))}</h1>` +
    `<p style="margin:0 0 2rem;opacity:.8">${escapeHtml(loc(block.lead, locale, `${where} lead`))}</p>` +
    sections +
    faq +
    nav +
    '</div><!--/seo-static-->'
  )
}

/**
 * `fr`, `en` et `x-default`, tous trois présents sur CHAQUE page des deux
 * arbres, y compris la page qui se désigne elle-même.
 *
 * L'auto-référence n'est pas un oubli : Google exige que l'ensemble des
 * alternates soit identique d'une page à l'autre du groupe, sans quoi il
 * ignore le groupe entier et traite les deux URLs comme du contenu dupliqué.
 * C'est aussi ce qui rend la réciprocité vérifiable fichier par fichier
 * (check-seo-dist.mjs).
 */
function renderAlternates(routePath) {
  const links = SEO_LOCALES.map(
    (l) =>
      `<link rel="alternate" hreflang="${l}" href="${ORIGIN}${localizedPath(l, routePath)}" />`,
  )
  links.push(
    `<link rel="alternate" hreflang="x-default" href="${ORIGIN}${localizedPath(DEFAULT_SEO_LOCALE, routePath)}" />`,
  )
  return links
}

/**
 * Réécrit les champs du JSON-LD d'index.html qui dépendent de la langue.
 *
 * Les URLs et `@id` sont déjà traités par rewriteOrigin ; restent
 * `inLanguage`, la description du WebSite et le `genre` du VideoGame, en
 * français en dur dans le gabarit. Servis tels quels sur l'arbre anglais, ils
 * annoncent à Google un site français à une URL anglaise.
 *
 * Parse / mutation / re-sérialisation plutôt qu'un remplacement de chaînes :
 * une regex sur la valeur française casserait en silence le jour où
 * index.html la reformule.
 */
function patchJsonLd(html, locale) {
  const match = html.match(JSONLD_RE)
  if (!match) {
    console.warn(
      '[prerender-seo] aucun bloc JSON-LD dans index.html — rien à localiser',
    )
    return html
  }

  const meta = SITE_META[locale]
  const data = JSON.parse(match[1])

  for (const node of data['@graph'] ?? []) {
    if (node.inLanguage) {
      node.inLanguage = meta.inLanguage
    }
    if (node['@type'] === 'WebSite') {
      node.description = meta.siteDescription
    }
    if (node['@type'] === 'VideoGame') {
      node.genre = meta.genre
    }
  }

  return html.replace(
    JSONLD_RE,
    `<script type="application/ld+json">\n${JSON.stringify(data, null, 2)}\n    </script>`,
  )
}

function patchHtml(template, route, locale) {
  const meta = SITE_META[locale]
  const where = `${route.path} [${locale}]`
  const url = `${ORIGIN}${localizedPath(locale, route.path)}`
  const title = escapeHtml(loc(route.title, locale, `${where} title`))
  const desc = escapeHtml(loc(route.description, locale, `${where} description`))

  let html = rewriteOrigin(template)

  // <html lang> — le gabarit est figé sur la langue par défaut.
  html = html.replace(/<html lang="[^"]*">/, `<html lang="${meta.htmlLang}">`)

  // <title>
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)

  // <meta name="description">
  html = upsertTag(
    html,
    /<meta\s+name="description"[^>]*>/,
    `<meta name="description" content="${desc}" />`,
  )

  // canonical
  html = upsertTag(
    html,
    /<link\s+rel="canonical"[^>]*>/,
    `<link rel="canonical" href="${url}" />`,
  )

  // hreflang — on retire ceux du gabarit (il n'en a pas aujourd'hui, mais
  // rester idempotent évite de les empiler le jour où il en portera).
  html = html.replace(ALTERNATE_RE, '')
  html = html.replace(
    '</head>',
    `${renderAlternates(route.path)
      .map((tag) => `    ${tag}\n`)
      .join('')}  </head>`,
  )

  // OpenGraph: title / description / url / locale
  html = upsertTag(
    html,
    /<meta\s+property="og:title"[^>]*>/,
    `<meta property="og:title" content="${title}" />`,
  )
  html = upsertTag(
    html,
    /<meta\s+property="og:description"[^>]*>/,
    `<meta property="og:description" content="${desc}" />`,
  )
  html = upsertTag(
    html,
    /<meta\s+property="og:url"[^>]*>/,
    `<meta property="og:url" content="${url}" />`,
  )
  html = upsertTag(
    html,
    /<meta\s+property="og:locale"[^>]*>/,
    `<meta property="og:locale" content="${meta.ogLocale}" />`,
  )
  html = upsertTag(
    html,
    /<meta\s+property="og:image:alt"[^>]*>/,
    `<meta property="og:image:alt" content="${escapeHtml(meta.ogImageAlt)}" />`,
  )

  // Twitter card
  html = upsertTag(
    html,
    /<meta\s+name="twitter:title"[^>]*>/,
    `<meta name="twitter:title" content="${title}" />`,
  )
  html = upsertTag(
    html,
    /<meta\s+name="twitter:description"[^>]*>/,
    `<meta name="twitter:description" content="${desc}" />`,
  )

  html = patchJsonLd(html, locale)

  // Retiré d'abord pour rester idempotent sur un HTML déjà patché.
  html = html.replace(STATIC_BLOCK_RE, '')
  if (route.staticBlock) {
    html = html.replace(ROOT_DIV, renderStaticBlock(route, locale) + ROOT_DIV)
  }

  return html
}

// ---------------------------------------------------------------------------
// Sitemap, robots, redirections
// ---------------------------------------------------------------------------

/**
 * dist/sitemap.xml, dérivé de SEO_ROUTES.
 *
 * Généré plutôt que versionné dans public/ : la liste des routes existait en
 * double et le sitemap prenait du retard à chaque ajout.
 *
 * Chaque `<url>` porte ses `xhtml:link` alternates — c'est ce qui dit à Google
 * que `/fr/guide` et `/en/guide` sont la même page traduite et non deux pages
 * dupliquées. Un sitemap qui listerait les deux langues SANS alternates ferait
 * plus de mal que pas de sitemap du tout.
 *
 * `lastmod` vaut la date du build. C'est la seule date honnête dont on
 * dispose ici : l'image de prod ne reçoit pas le .git (voir deploy/Dockerfile),
 * et un déploiement republie de toute façon l'intégralité du bundle.
 */
async function writeSitemap() {
  const lastmod = new Date().toISOString().slice(0, 10)

  const entries = []
  for (const route of SEO_ROUTES) {
    const { changefreq, priority } = route.sitemap
    const alternates = [
      ...SEO_LOCALES.map(
        (l) =>
          `    <xhtml:link rel="alternate" hreflang="${l}" href="${ORIGIN}${localizedPath(l, route.path)}" />`,
      ),
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${ORIGIN}${localizedPath(DEFAULT_SEO_LOCALE, route.path)}" />`,
    ]

    for (const locale of SEO_LOCALES) {
      entries.push(
        [
          '  <url>',
          `    <loc>${ORIGIN}${localizedPath(locale, route.path)}</loc>`,
          `    <lastmod>${lastmod}</lastmod>`,
          `    <changefreq>${changefreq}</changefreq>`,
          `    <priority>${priority}</priority>`,
          ...alternates,
          '  </url>',
        ].join('\n'),
      )
    }
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    entries.join('\n'),
    '</urlset>',
    '',
  ].join('\n')

  const target = path.join(DIST_DIR, 'sitemap.xml')
  await fs.writeFile(target, xml, 'utf8')
  console.log(
    `[prerender-seo] sitemap     → ${path.relative(process.cwd(), target)} (${entries.length} URL, lastmod ${lastmod})`,
  )
}

/**
 * dist/robots.txt, généré pour la même raison que le sitemap : il portait la
 * seule autre occurrence en dur du domaine hors index.html.
 */
async function writeRobots() {
  const txt = ['User-agent: *', 'Allow: /', '', `Sitemap: ${ORIGIN}/sitemap.xml`, ''].join('\n')
  const target = path.join(DIST_DIR, 'robots.txt')
  await fs.writeFile(target, txt, 'utf8')
  console.log(`[prerender-seo] robots      → ${path.relative(process.cwd(), target)}`)
}

/**
 * Fragment nginx : une 301 par ancienne URL publique vers son équivalent
 * `/fr/…`.
 *
 * Dérivé de SEO_ROUTES et non écrit à la main dans nginx.conf : c'est la
 * parade inscrite en §8 de la spec contre le risque « les 301 manquent une
 * ancienne URL indexée ». Une liste tenue à la main dans un second fichier
 * prendrait du retard exactement comme le sitemap le faisait avant d'être
 * généré.
 *
 * Vers `/fr` et non vers la langue du visiteur : le site n'existait qu'en
 * français avant ce chantier, donc tout le capital d'indexation à préserver
 * est français, et une 301 doit avoir une cible unique et cachable — c'est
 * exactement ce qui distingue ces redirections de la 302 sur `/`.
 *
 * `/` est absent : c'est la 302 par `Accept-Language` de nginx.conf, écrite à
 * la main parce qu'elle ne dérive d'aucune route.
 *
 * Les deux formes (`/guide` et `/guide/`) sont émises : `location =` est une
 * correspondance exacte, et nginx servait bien les deux avant le lot 3
 * (`try_files $uri/index.html`).
 */
async function writeNginxRedirects() {
  const lines = [
    '# Généré par front/scripts/prerender-seo.mjs — NE PAS ÉDITER À LA MAIN.',
    '# Inclus par deploy/conf/nginx.conf dans le bloc server par défaut.',
    '#',
    `# 301 des anciennes URLs publiques (sans préfixe de langue) vers /${LEGACY_LOCALE}.`,
    '# $is_args$args conserve la query string : un lien déjà partagé vers',
    '# /guide?utm_source=x atterrit sur /fr/guide?utm_source=x.',
    '',
  ]

  let count = 0
  for (const route of SEO_ROUTES) {
    if (route.path === '/') {
      continue
    }
    const target = `${localizedPath(LEGACY_LOCALE, route.path)}$is_args$args`
    lines.push(`location = ${route.path} { return 301 ${target}; }`)
    lines.push(`location = ${route.path}/ { return 301 ${target}; }`)
    count += 2
  }
  lines.push('')

  await fs.mkdir(NGINX_DIR, { recursive: true })
  const target = path.join(NGINX_DIR, 'seo-legacy-redirects.conf')
  await fs.writeFile(target, lines.join('\n'), 'utf8')
  console.log(
    `[prerender-seo] nginx 301   → ${path.relative(process.cwd(), target)} (${count} location)`,
  )
}

// ---------------------------------------------------------------------------

async function main() {
  const indexPath = path.join(DIST_DIR, 'index.html')

  let template
  try {
    template = await fs.readFile(indexPath, 'utf8')
  } catch {
    console.error(
      `[prerender-seo] dist/index.html not found at ${indexPath}. ` +
        'Did `vite build` run? Skipping.',
    )
    process.exitCode = 1
    return
  }

  assertLocalized()

  let written = 0
  for (const locale of SEO_LOCALES) {
    for (const route of SEO_ROUTES) {
      const html = patchHtml(template, route, locale)

      const dir = path.join(
        DIST_DIR,
        localizedPath(locale, route.path).replace(/^\//, ''),
      )
      await fs.mkdir(dir, { recursive: true })
      const target = path.join(dir, 'index.html')

      await fs.writeFile(target, html, 'utf8')
      written++
      console.log(
        `[prerender-seo] ${localizedPath(locale, route.path).padEnd(15)} → ${path.relative(process.cwd(), target)}`,
      )
    }
  }

  // Le fallback SPA : aucun patch de route, seulement l'origine, pour qu'un
  // build de staging n'y laisse pas l'og:image et l'Umami de production.
  await fs.writeFile(indexPath, rewriteOrigin(template), 'utf8')

  await writeSitemap()
  await writeRobots()
  await writeNginxRedirects()

  console.log(
    `[prerender-seo] ${written} fichier(s) prérendu(s) — ${SEO_ROUTES.length} route(s) × ${SEO_LOCALES.length} langue(s) pour ${ORIGIN}` +
      (ORIGIN === DEFAULT_ORIGIN ? '' : ' (SITE_ORIGIN surchargée)'),
  )
}

main().catch((err) => {
  console.error('[prerender-seo] failed:', err)
  process.exit(1)
})
