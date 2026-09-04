'use server'

import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { generateImage } from 'ai'
import data from '../public/data.json'

/**
 * Virtual try-on, powered by the AI SDK talking to the Vercel AI Gateway.
 *
 * A bare model id (`provider/model`) is resolved by the AI SDK's default
 * provider, which is the Gateway. It authenticates with `AI_GATEWAY_API_KEY`
 * (or Vercel OIDC when deployed), so there is no provider SDK to wire up.
 */
const MODEL = 'google/gemini-2.5-flash-image-preview'

/** Uploaded photos are downscaled in the browser; this is a backstop. */
const MAX_PHOTO_BYTES = 6 * 1024 * 1024

export type TryOnResult
  = | { ok: true, image: string }
    | { ok: false, error: string }

/**
 * Generations are deterministic for a given (photo, product) pair, so results
 * are memoized per server instance. This also collapses the duplicate calls
 * React's StrictMode fires in development into a single Gateway request.
 */
const cache = new Map<string, Promise<TryOnResult>>()
const MAX_CACHE_ENTRIES = 64

function prompt(title: string) {
  return [
    'You are a virtual try-on engine for an online store.',
    'The first image is a photo of a real customer. The second image is a product photo of the item described as:',
    `"${title}".`,
    '',
    'Produce a single photorealistic image of the person from the first image wearing that product.',
    '',
    'Requirements:',
    '- Keep the person\'s face, hair, skin tone, body proportions and pose exactly as they are. Do not beautify or restyle them.',
    '- Reproduce the product\'s exact colour, material, print, logo placement and silhouette from the second image.',
    '- Fit the garment to the body naturally, with realistic folds, drape and contact shadows.',
    '- Keep the original background, framing and lighting direction of the first photo.',
    '- If the product only covers part of the body, leave the person\'s other clothing untouched.',
    '- Output only the final photo. No text, watermarks, collages or side-by-side comparisons.',
  ].join('\n')
}

/** Splits a `data:` URL into its media type and raw base64 payload. */
function parseDataUrl(dataUrl: string) {
  const match = /^data:(image\/[a-z+.-]+);base64,(.+)$/i.exec(dataUrl)

  if (!match)
    return null

  return { mediaType: match[1], base64: match[2] }
}

async function readProductImage(image: string) {
  // `image` comes from data.json, never from the client, but keep the read
  // pinned inside public/ regardless.
  const publicDir = path.join(process.cwd(), 'public')
  const file = path.join(publicDir, image)

  if (!file.startsWith(`${publicDir}${path.sep}`))
    throw new Error(`refusing to read outside public/: ${image}`)

  return readFile(file)
}

async function tryOn(photo: string, productId: string): Promise<TryOnResult> {
  const product = data.products.find(candidate => candidate.id === productId)

  if (!product)
    return { ok: false, error: 'Unknown product.' }

  const person = parseDataUrl(photo)

  if (!person)
    return { ok: false, error: 'That file is not a supported image.' }

  if (Buffer.byteLength(person.base64, 'base64') > MAX_PHOTO_BYTES)
    return { ok: false, error: 'That photo is too large. Try one under 6 MB.' }

  const garment = await readProductImage(product.image)

  const { image } = await generateImage({
    model: MODEL,
    prompt: {
      images: [person.base64, garment.toString('base64')],
      text: prompt(product.title.default),
    },
    aspectRatio: '1:1',
  })

  return { ok: true, image: `data:${image.mediaType};base64,${image.base64}` }
}

export async function generateTryOn(photo: string, productId: string): Promise<TryOnResult> {
  const key = `${createHash('sha256').update(photo).digest('hex')}:${productId}`
  const cached = cache.get(key)

  if (cached)
    return cached

  const pending = tryOn(photo, productId).catch((error) => {
    // A failure should not be cached — let the shopper retry.
    cache.delete(key)
    console.error(`try-on failed for "${productId}":`, error)

    // Surface a single readable line; the full error is in the server log.
    const [reason] = error instanceof Error ? error.message.split('\n') : []

    return { ok: false as const, error: reason || 'The try-on service is unavailable.' }
  })

  if (cache.size >= MAX_CACHE_ENTRIES)
    cache.delete(cache.keys().next().value!)

  cache.set(key, pending)

  return pending
}
