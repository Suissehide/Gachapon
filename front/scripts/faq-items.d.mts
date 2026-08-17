// Types for faq-items.mjs, so `src/` and the build script share one copy of
// the FAQ instead of each keeping its own.

export type FaqItem = {
  /** Question. */
  q: string
  /** Answer, plain text (no markup). */
  a: string
}

export declare const FAQ_ITEMS: FaqItem[]
