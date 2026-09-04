import { notFound } from 'next/navigation'
import { Storefront } from '@/app/storefront'
import { isVariant, VARIANTS } from '@/app/variant'

/**
 * One prerendered storefront per experiment bucket. Visitors never see these
 * URLs: proxy.ts rewrites `/` to the right one, so the address bar still says
 * `/` and the response is static HTML built at deploy time.
 */
export function generateStaticParams() {
  return VARIANTS.map(variant => ({ variant }))
}

// No `dynamicParams = false` here: the route segment config is rejected when
// cacheComponents is on. The notFound() below does the same job, and unknown
// buckets only ever arrive from someone typing the URL by hand.

// Image generation runs through a Server Action and can take a while.
export const maxDuration = 60

export default async function VariantPage({
  params,
}: {
  params: Promise<{ variant: string }>
}) {
  const { variant } = await params

  if (!isVariant(variant))
    notFound()

  return <Storefront variant={variant} />
}
