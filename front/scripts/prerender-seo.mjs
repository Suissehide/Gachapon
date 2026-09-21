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
// What it does:
//   For each route declared in `seo-routes.mjs`, it writes
//   `dist/<route>/index.html` (or overwrites `dist/index.html` for `/`) with
//   the right <title>, description, canonical, and OpenGraph tags rewritten
//   into the static HTML, plus a `#seo-static` body block carrying the page's
//   real copy and the links to the other public routes. It also emits
//   `dist/sitemap.xml` from the same source.
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
// Usage:
//   `npm run build` (wired via the `postbuild` hook in package.json).

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { FAQ_ITEMS } from './faq-items.mjs'
import { SEO_ROUTES, SITE_ORIGIN as DEFAULT_ORIGIN } from './seo-routes.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST_DIR = path.resolve(__dirname, '../dist')

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

/**
 * Liens vers les autres routes publiques.
 *
 * La navigation de l'app est rendue par React : sans ces ancres, le HTML servi
 * ne contient aucun <a href> et Google n'a aucun chemin d'une page à l'autre.
 * La route courante est omise — un lien vers soi-même n'apporte rien.
 */
function renderNav(currentPath) {
  const links = SEO_ROUTES.filter((r) => r.path !== currentPath)
    .map(
      (r) =>
        `<a href="${r.path}" style="color:inherit">${escapeHtml(r.navLabel)}</a>`,
    )
    .join(' · ')

  return (
    '<nav aria-label="Pages du site" style="margin-top:3rem;padding-top:1.5rem;border-top:1px solid rgba(128,128,128,.25);font-size:.9rem;opacity:.75">' +
    links +
    '</nav>'
  )
}

function renderSection(section) {
  const heading = `<h2 style="font-size:1.05rem;margin:1.75rem 0 .5rem">${escapeHtml(section.h)}</h2>`

  if (section.items) {
    return (
      heading +
      '<ul style="margin:0;padding-left:1.25rem;opacity:.8">' +
      section.items
        .map((item) => `<li style="margin:.2rem 0">${escapeHtml(item)}</li>`)
        .join('') +
      '</ul>'
    )
  }

  return `${heading}<p style="margin:0;opacity:.8">${escapeHtml(section.p)}</p>`
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
function renderStaticBlock(route) {
  const block = route.staticBlock

  const sections = (block.sections ?? []).map(renderSection).join('')

  const faq = block.faq
    ? FAQ_ITEMS.map(
        (item) =>
          `<h2 style="font-size:1.05rem;margin:1.5rem 0 .35rem">${escapeHtml(item.q)}</h2>` +
          `<p style="margin:0;opacity:.75">${escapeHtml(item.a)}</p>`,
      ).join('')
    : ''

  const nav = block.nav === false ? '' : renderNav(route.path)

  return (
    '<div id="seo-static" style="max-width:44rem;margin:0 auto;padding:4rem 1.5rem;line-height:1.6">' +
    `<h1 style="font-size:2rem;margin:0 0 1rem">${escapeHtml(block.heading)}</h1>` +
    `<p style="margin:0 0 2rem;opacity:.8">${escapeHtml(block.lead)}</p>` +
    sections +
    faq +
    nav +
    '</div><!--/seo-static-->'
  )
}

function patchHtml(template, route) {
  const url = `${ORIGIN}${route.path}`
  const title = escapeHtml(route.title)
  const desc = escapeHtml(route.description)

  let html = rewriteOrigin(template)

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

  // OpenGraph: title / description / url
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

  // Retiré d'abord pour rester idempotent sur un HTML déjà patché.
  html = html.replace(STATIC_BLOCK_RE, '')
  if (route.staticBlock) {
    html = html.replace(ROOT_DIV, renderStaticBlock(route) + ROOT_DIV)
  }

  return html
}

/**
 * dist/sitemap.xml, dérivé de SEO_ROUTES.
 *
 * Généré plutôt que versionné dans public/ : la liste des routes existait en
 * double et le sitemap prenait du retard à chaque ajout.
 *
 * `lastmod` vaut la date du build. C'est la seule date honnête dont on
 * dispose ici : l'image de prod ne reçoit pas le .git (voir deploy/Dockerfile),
 * et un déploiement republie de toute façon l'intégralité du bundle.
 */
async function writeSitemap() {
  const lastmod = new Date().toISOString().slice(0, 10)

  const urls = SEO_ROUTES.map((route) => {
    const { changefreq, priority } = route.sitemap
    return [
      '  <url>',
      `    <loc>${ORIGIN}${route.path}</loc>`,
      `    <lastmod>${lastmod}</lastmod>`,
      `    <changefreq>${changefreq}</changefreq>`,
      `    <priority>${priority}</priority>`,
      '  </url>',
    ].join('\n')
  }).join('\n')

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    '</urlset>',
    '',
  ].join('\n')

  const target = path.join(DIST_DIR, 'sitemap.xml')
  await fs.writeFile(target, xml, 'utf8')
  console.log(
    `[prerender-seo] sitemap     → ${path.relative(process.cwd(), target)} (${SEO_ROUTES.length} URL, lastmod ${lastmod})`,
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

async function main() {
  const indexPath = path.join(DIST_DIR, 'index.html')

  let template
  try {
    template = await fs.readFile(indexPath, 'utf8')
  } catch (err) {
    console.error(
      `[prerender-seo] dist/index.html not found at ${indexPath}. ` +
        'Did `vite build` run? Skipping.',
    )
    process.exitCode = 1
    return
  }

  let written = 0
  for (const route of SEO_ROUTES) {
    const html = patchHtml(template, route)

    let target
    if (route.path === '/') {
      target = indexPath
    } else {
      const dir = path.join(DIST_DIR, route.path.replace(/^\//, ''))
      await fs.mkdir(dir, { recursive: true })
      target = path.join(dir, 'index.html')
    }

    await fs.writeFile(target, html, 'utf8')
    written++
    console.log(
      `[prerender-seo] ${route.path.padEnd(12)} → ${path.relative(process.cwd(), target)}`,
    )
  }

  await writeSitemap()
  await writeRobots()

  console.log(
    `[prerender-seo] ${written} route(s) prerendered for ${ORIGIN}` +
      (ORIGIN === DEFAULT_ORIGIN ? '' : ' (SITE_ORIGIN surchargée)'),
  )
}

main().catch((err) => {
  console.error('[prerender-seo] failed:', err)
  process.exit(1)
})
