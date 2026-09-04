/**
 * The title copy experiment.
 *
 * Assignment happens in proxy.ts before the request reaches the app, and the
 * chosen variant is baked into a prerendered page. Nothing here runs in the
 * browser, so the titles are in the HTML and there is no swap after hydration.
 *
 * Two rules make this an experiment rather than a random title generator:
 *
 * 1. `default` is in the pool. It is the control. Without one there is nothing
 *    to measure the other three against, so the test cannot answer marketing's
 *    question however much traffic it gets.
 *
 * 2. One bucket per visitor, not one per product. A shopper who saw variant
 *    `a` on the hoodie and `c` on the cap belongs to no group, so no
 *    conversion from that session can be attributed to any variant.
 */

export const VARIANTS = ['default', 'a', 'b', 'c'] as const

export type Variant = (typeof VARIANTS)[number]

/** Name of the sticky assignment cookie. Read in proxy.ts, set there too. */
export const VARIANT_COOKIE = 'title-variant'

/** Ninety days. Long enough that a returning shopper stays in their group. */
export const VARIANT_MAX_AGE = 60 * 60 * 24 * 90

export function isVariant(value: string | null | undefined): value is Variant {
  return value != null && (VARIANTS as readonly string[]).includes(value)
}

export function pickVariant(): Variant {
  return VARIANTS[Math.floor(Math.random() * VARIANTS.length)]
}
