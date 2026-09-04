import { Storefront } from './storefront'

/**
 * The control, and the fallback.
 *
 * In production every request to `/` is rewritten by proxy.ts to
 * `/v/<bucket>`, so this is what renders when the proxy does not run: a static
 * export, a direct render in a test, or a platform without proxy support. It
 * shows the default copy, which is the right thing to fall back to.
 */
export const maxDuration = 60

export default function Home() {
  return <Storefront variant="default" />
}
