import type { Variant } from './variant'
import { cacheLife } from 'next/cache'
import { getProducts } from '@/lib/api'
import ProductPage from './product'
import { TryOnProvider, TryOnUploader } from './try-on'

/**
 * The storefront, rendered for one experiment bucket.
 *
 * `use cache` keyed on the variant, so the four buckets are four cached
 * renders rather than four copies of this file. `lib/api.ts` sleeps for up to
 * three seconds and cannot be modified, and this is what makes a visitor stop
 * paying for it.
 */
export async function Storefront({ variant }: { variant: Variant }) {
  'use cache'
  cacheLife('weeks')

  const products = await getProducts()

  return (
    <TryOnProvider>
      <section>
        <div className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-balance text-3xl font-medium tracking-tight sm:text-4xl">
            New Arrivals
          </h2>

          <TryOnUploader />
        </div>

        <ul className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product, index) => (
            <li key={product.id}>
              <ProductPage
                product={product}
                index={index}
                title={product.title[variant]}
              />
            </li>
          ))}
        </ul>
      </section>
    </TryOnProvider>
  )
}
