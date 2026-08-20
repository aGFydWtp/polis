import { createContext, useContext } from 'react'

/**
 * Mount point of this app (`/alpha` behind nginx, `''` at the root), resolved
 * on the server from `X-Forwarded-Prefix`. `null` means no provider — the
 * pre-v2 screens, which only ever render one segment below the mount point,
 * where a relative asset URL still resolves correctly.
 */
export const BasePathContext = createContext<string | null>(null)

/** URL for a file in `public/`, kept relative when no provider is present. */
export function useAssetUrl(file: string): string {
  const basePath = useContext(BasePathContext)
  return basePath === null ? file : `${basePath}/${file}`
}
