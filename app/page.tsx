import { cacheLife, cacheTag } from 'next/cache'
import { Suspense } from 'react'
import { getProducts } from '@/lib/api'
import ProductPage from './product'
import { TryOnProvider, TryOnUploader } from './try-on'

// export const dynamic = 'force-dynamic'

// Image generation runs through a Server Action and can take a while.
export const maxDuration = 60

export default async function Home() {
  'use cache'
  cacheLife('weeks')
  // cacheTag('variant')
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
          {products.map((product, index) => {
            return (
              <li key={product.id}>
                <Suspense fallback={<div className="h-96 w-full animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900" />}>
                  <ProductPage product={product} index={index} />
                </Suspense>
              </li>
            )
          })}
        </ul>
      </section>
    </TryOnProvider>
  )
}
