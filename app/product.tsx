'use client'

import type { Product } from '@/lib/api'
import Image from 'next/image'
import * as React from 'react'
import { generateTryOn } from './actions'
import { useTryOn } from './try-on-context'

type TryOnState
  = | { status: 'loading' }
    | { status: 'ready', image: string }
    | { status: 'error', error: string }

export default function ProductPage({ product, index }: { product: Product, index: number }) {
  // get random product title per user

  const [title, setTitle] = React.useState('loading...')

  React.useEffect(() => {
    async function fetchData() {
      // check if it exists
      if (localStorage.getItem(`product-${product.id}-title`) === null) {
        const randomIndex = Math.floor(Math.random() * 3)
        const newTitle = randomIndex === 0 ? product.title.a : randomIndex === 1 ? product.title.b : randomIndex === 2 ? product.title.c : product.title.default
        localStorage.setItem(`product-${product.id}-title`, newTitle)
      }
      const newTitle = localStorage.getItem(`product-${product.id}-title`) || product.title.default
      setTitle(newTitle)
    }
    fetchData()
  }, [product, index])

  const { photo } = useTryOn()

  // Keyed by photo id so a new upload resets to the loading state without an
  // extra render pass.
  const [results, setResults] = React.useState<Record<string, TryOnState>>({})
  const [originalFor, setOriginalFor] = React.useState<string | null>(null)

  const tryOn: TryOnState | null = photo ? results[photo.id] ?? { status: 'loading' } : null

  // Every product regenerates in parallel as soon as a photo lands.
  React.useEffect(() => {
    if (!photo)
      return

    let cancelled = false

    function record(state: TryOnState) {
      if (!cancelled)
        setResults(current => ({ ...current, [photo!.id]: state }))
    }

    generateTryOn(photo.dataUrl, product.id)
      .then(result => record(result.ok
        ? { status: 'ready', image: result.image }
        : { status: 'error', error: result.error }))
      .catch(() => record({ status: 'error', error: 'Try-on failed. Please try again.' }))

    return () => {
      cancelled = true
    }
  }, [photo, product.id])

  const wearing = tryOn?.status === 'ready' && originalFor !== photo?.id

  return (
    <>
      <div className="group relative aspect-square overflow-hidden bg-zinc-100 dark:bg-zinc-900">
        <Image
          preload={index === 0}
          src={product.image}
          alt={title}
          width={800}
          height={800}
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          className="h-full w-full object-cover"
        />

        {tryOn?.status === 'ready' && (
          // The model returns an in-memory data URL: nothing for next/image to do.
          <img
            src={tryOn.image}
            alt={`${title} worn by you`}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${wearing ? 'opacity-100' : 'opacity-0'}`}
          />
        )}

        {tryOn?.status === 'loading' && (
          <div className="absolute inset-0 flex items-end bg-white/70 backdrop-blur-[2px] dark:bg-zinc-950/70">
            <div className="w-full p-4">
              <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-600 dark:text-zinc-400">
                Trying it on…
              </p>
              <div className="mt-2 h-px w-full overflow-hidden bg-zinc-300 dark:bg-zinc-700">
                <div className="h-full w-1/3 animate-[tryOnScan_1.4s_ease-in-out_infinite] bg-zinc-900 dark:bg-zinc-100" />
              </div>
            </div>
          </div>
        )}

        {tryOn?.status === 'error' && (
          <div className="absolute inset-x-0 bottom-0 bg-white/90 p-3 dark:bg-zinc-950/90">
            <p className="font-mono text-[11px] uppercase tracking-widest text-red-600 dark:text-red-400">
              {tryOn.error}
            </p>
          </div>
        )}

        {tryOn?.status === 'ready' && (
          <button
            type="button"
            onClick={() => setOriginalFor(current => (current === photo?.id ? null : photo?.id ?? null))}
            className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-zinc-900 shadow-sm transition-colors hover:bg-white dark:bg-zinc-950/90 dark:text-zinc-100 dark:hover:bg-zinc-950"
          >
            {wearing ? 'Product' : 'On me'}
          </button>
        )}
      </div>

      <div className="mt-4 flex items-baseline justify-between gap-4">
        <h3 className="min-w-0 truncate text-sm font-medium">{title}</h3>
        <p className="text-sm tabular-nums text-zinc-600 dark:text-zinc-400">
          $
          {product.price}
        </p>
      </div>
    </>
  )
}
