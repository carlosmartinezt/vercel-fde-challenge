'use client'

import * as React from 'react'

export interface Photo {
  /** Changes on every upload so products know to regenerate. */
  id: string
  dataUrl: string
}

export interface TryOnContextValue {
  photo: Photo | null
  setPhoto: (photo: Photo | null) => void
}

export const TryOnContext = React.createContext<TryOnContextValue | null>(null)

export function useTryOn() {
  const context = React.use(TryOnContext)

  if (!context)
    throw new Error('useTryOn must be used inside <TryOnProvider>')

  return context
}
