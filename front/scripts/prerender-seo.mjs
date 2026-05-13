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
