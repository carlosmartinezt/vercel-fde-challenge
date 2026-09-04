/**
 * Title variant assignment for the copy experiment.
 *
 * Two rules that make this an experiment rather than a random title generator:
 *
 * 1. `default` is in the pool. It is the control. Without a control there is
 *    nothing to measure the other three against, so the test cannot answer
 *    marketing's question however much traffic it gets.
 *
 * 2. One bucket per visitor, not one per product. A shopper who saw variant
 *    `a` on the hoodie and `c` on the cap belongs to no group, so no
 *    conversion from that session can be attributed to any variant.
 *
 * The assignment is sticky in localStorage, so a returning visitor stays in
 * the group they were first put in.
 */

export const VARIANTS = ['default', 'a', 'b', 'c'] as const

export type Variant = (typeof VARIANTS)[number]

const STORAGE_KEY = 'title-variant'

/** Assigned once per tab, so all four products read the same value. */
let assigned: Variant | null = null

function isVariant(value: string | null): value is Variant {
  return value !== null && (VARIANTS as readonly string[]).includes(value)
}

/**
 * The visitor's bucket. Client only: it reads localStorage, so calling it
 * during render would differ between the server and the first client render.
 * Call it from an effect.
 */
export function getVariant(): Variant {
  if (assigned)
    return assigned

  try {
    const stored = localStorage.getItem(STORAGE_KEY)

    if (isVariant(stored)) {
      assigned = stored
      return assigned
    }
  }
  catch {
    // Private mode, or storage disabled. Fall through and assign in memory:
    // the visitor is still in a group for this session, just not a sticky one.
  }

  assigned = VARIANTS[Math.floor(Math.random() * VARIANTS.length)]

  try {
    localStorage.setItem(STORAGE_KEY, assigned)
  }
  catch {}

  return assigned
}
