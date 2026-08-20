/** Header nginx sets on the `/alpha/` location before stripping the prefix. */
const PREFIX_HEADER = 'x-forwarded-prefix'

/**
 * Path this app is mounted under, or `''` when it is served from the root.
 *
 * nginx serves the participation UI under `/alpha/` and rewrites the prefix
 * away before proxying, so the request Astro sees looks root-mounted. Links
 * have to put the prefix back or they escape the app and hit the legacy
 * backend. Only a plain absolute path is accepted — the header is proxy-set,
 * but a rogue value must not turn a link into an off-site URL.
 */
export function resolveBasePath(headers: Headers): string {
  const raw = headers.get(PREFIX_HEADER) ?? ''
  if (!/^\/[A-Za-z0-9._~/-]*$/.test(raw)) return ''
  return raw.replace(/\/+$/, '')
}
