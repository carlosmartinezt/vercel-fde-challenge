import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { isVariant, pickVariant, VARIANT_COOKIE, VARIANT_MAX_AGE } from '@/app/variant'

/**
 * A/B assignment for the title copy experiment.
 *
 * The constraint from the brief is that personalizing the page must not cost
 * the static delivery won in #1. Reading the cookie inside the page would opt
 * the whole route back into dynamic rendering and undo exactly that, so the
 * assignment happens out here instead: pick a bucket, remember it in a cookie,
 * and rewrite to the prerendered page for that bucket.
 *
 * Every visitor is served static HTML with their variant already in it. There
 * is no client-side swap, so the titles are in the markup for crawlers, and
 * nothing flashes.
 *
 * Note the file name: `middleware.ts` is deprecated in Next 16 and this is its
 * replacement. The docs also advise reaching for it only when nothing else
 * will do, which is the case here: setting a cookie is impossible from a
 * Server Component, and a Route Handler or Server Action would mean a round
 * trip the visitor waits for.
 */
export function proxy(request: NextRequest) {
  const existing = request.cookies.get(VARIANT_COOKIE)?.value
  const variant = isVariant(existing) ? existing : pickVariant()

  /**
   * On Vercel this would simply be
   * `NextResponse.rewrite(new URL(path, request.url))`.
   *
   * Self-hosted behind Caddy it is not. Caddy sets `X-Forwarded-Proto: https`,
   * so Next resolves its own origin as `https://localhost:3060`, decides the
   * rewrite target is a different origin, and tries to proxy out to it over
   * TLS on a plaintext port: `write EPROTO ... packet length too long`, and a
   * 500 that only appears through the proxy and never on 127.0.0.1.
   *
   * Naming the internal origin explicitly keeps the rewrite internal.
   */
  const url = new URL(
    `/v/${variant}`,
    process.env.INTERNAL_ORIGIN ?? request.nextUrl.origin,
  )

  const response = NextResponse.rewrite(url)

  // Rewritten every time, so a returning visitor with a valid cookie is not
  // reassigned; only the expiry slides forward.
  response.cookies.set(VARIANT_COOKIE, variant, {
    path: '/',
    maxAge: VARIANT_MAX_AGE,
    sameSite: 'lax',
    httpOnly: false, // Analytics needs to read which bucket the visitor is in.
  })

  return response
}

/**
 * The storefront is one page, so this runs on one path. Without a matcher it
 * would run on every request including `_next/static` and everything in
 * `public/`, which is both wasted work and an easy way to break asset loading.
 */
export const config = {
  matcher: '/',
}
