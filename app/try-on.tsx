'use client'

import type { Photo } from './try-on-context'
import * as React from 'react'
import { TryOnContext, useTryOn } from './try-on-context'

/** Longest edge, in pixels, of the photo sent to the model. */
const MAX_EDGE = 1024
const ACCEPTED = 'image/png,image/jpeg,image/webp'

export function TryOnProvider({ children }: { children: React.ReactNode }) {
  const [photo, setPhoto] = React.useState<Photo | null>(null)

  return (
    <TryOnContext value={{ photo, setPhoto }}>{children}</TryOnContext>
  )
}

/**
 * Downscales and re-encodes the upload in the browser. Phone photos are
 * routinely 5–10 MB, which is both slower for the model and past the default
 * 1 MB Server Action body limit.
 */
async function downscale(file: File) {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')

  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)

  const context = canvas.getContext('2d')

  if (!context)
    throw new Error('Could not read that image.')

  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  return canvas.toDataURL('image/jpeg', 0.85)
}

export function TryOnUploader() {
  const { photo, setPhoto } = useTryOn()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  async function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    // Allow re-picking the same file after a reset.
    event.target.value = ''

    if (!file)
      return

    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.')
      return
    }

    setError(null)
    setBusy(true)

    try {
      setPhoto({ id: crypto.randomUUID(), dataUrl: await downscale(file) })
    }
    catch {
      setError('Could not read that image.')
    }
    finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div className="flex items-center gap-3">
        {photo && (
          // A client-side data URL: there is nothing for next/image to optimize.
          <img
            src={photo.dataUrl}
            alt="Your uploaded photo"
            className="size-9 rounded-full object-cover ring-1 ring-zinc-200 dark:ring-zinc-800"
          />
        )}

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="sr-only"
          onChange={onChange}
        />

        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="rounded-full border border-zinc-900 px-4 py-2 font-mono text-xs uppercase tracking-widest transition-colors hover:bg-zinc-900 hover:text-white disabled:opacity-50 dark:border-zinc-100 dark:hover:bg-zinc-100 dark:hover:text-zinc-900"
        >
          {busy ? 'Reading…' : photo ? 'Change photo' : 'Try it on'}
        </button>

        {photo && (
          <button
            type="button"
            onClick={() => setPhoto(null)}
            className="font-mono text-xs uppercase tracking-widest text-zinc-500 underline-offset-4 hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">
        {error ?? (photo ? 'Dressing you in every piece' : 'Upload a photo to see the fit')}
      </p>
    </div>
  )
}
