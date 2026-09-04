import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  cacheComponents: true,
  experimental: {
    // Uploaded photos are downscaled client-side, but leave headroom for the
    // base64 payload the try-on Server Action receives.
    serverActions: { bodySizeLimit: '4mb' },
  },
}

export default nextConfig
