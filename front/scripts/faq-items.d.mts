// Types de faq-items.mjs.

import type { Localized } from './seo-routes.d.mts'

export type FaqItem = {
  q: Localized
  /** Texte brut, sans balises. */
  a: Localized
}

export declare const FAQ_ITEMS: FaqItem[]
