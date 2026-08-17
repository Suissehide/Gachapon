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
//   into the static HTML. Asset references are kept absolute so they still
//   resolve from any URL depth.
//
// What it doesn't do:
//   It does NOT execute the React app. We don't want a headless browser in
//   the build pipeline. Per-route body content still hydrates client-side —
//   only the metadata is pre-baked. That's enough for Google to:
//     (1) see distinct titles/descriptions for each URL (no more dedup),
//     (2) compute a meaningful first-byte signal for ranking.
//
// Usage:
//   `npm run build` (wired via the `postbuild` hook in package.json).

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { FAQ_ITEMS } from './faq-items.mjs'
import { SEO_ROUTES, SITE_ORIGIN } from './seo-routes.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST_DIR = path.resolve(__dirname, '../dist')

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
 * Body content a crawler can read without executing any JS.
 *
 * It is emitted as a *sibling* of #root, never inside it: `src/main.tsx` only
 * mounts the app when #root is empty, so content placed inside would silently
 * prevent the app from ever booting. `main.tsx` removes this node as soon as
 * React mounts.
 *
 * It is deliberately NOT `hidden`: Google discounts hidden text, which would
 * defeat the point. The trade-off is a brief flash of unstyled content before
 * the JS boots, so the markup carries inline styles to stay presentable.
 */
function renderStaticBlock(block) {
  const faq = block.faq
    ? FAQ_ITEMS.map(
        (item) =>
          `<h2 style="font-size:1.05rem;margin:1.5rem 0 .35rem">${escapeHtml(item.q)}</h2>` +
          `<p style="margin:0;opacity:.75">${escapeHtml(item.a)}</p>`,
      ).join('')
    : ''

  return (
    '<div id="seo-static" style="max-width:44rem;margin:0 auto;padding:4rem 1.5rem;line-height:1.6">' +
    `<h1 style="font-size:2rem;margin:0 0 1rem">${escapeHtml(block.heading)}</h1>` +
    `<p style="margin:0 0 2rem;opacity:.8">${escapeHtml(block.lead)}</p>` +
    faq +
    '</div><!--/seo-static-->'
  )
}

function patchHtml(template, route) {
  const url = `${SITE_ORIGIN}${route.path}`
  const title = escapeHtml(route.title)
  const desc = escapeHtml(route.description)

  let html = template

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

  // Body content readable without JS. Strip any previous block first so
  // re-running the script on an already-patched HTML stays idempotent.
  html = html.replace(STATIC_BLOCK_RE, '')
  if (route.staticBlock) {
    html = html.replace(ROOT_DIV, renderStaticBlock(route.staticBlock) + ROOT_DIV)
  }

  return html
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

  console.log(`[prerender-seo] ${written} route(s) prerendered.`)
}

main().catch((err) => {
  console.error('[prerender-seo] failed:', err)
  process.exit(1)
})
