/**
 * Link targets inside the participation app.
 *
 * `basePath` is the app's mount point resolved from the proxy prefix header
 * (`/alpha` behind nginx, `''` at the root) — see `utils/basePath.ts`. Links
 * have to carry it or they escape the app.
 */

/** Voting page for a conversation. */
export function conversationPath(basePath: string, conversation_id: string): string {
  return `${basePath}/${conversation_id}`
}

/** Standalone visualization page for a conversation. */
export function visualizationPath(basePath: string, conversation_id: string): string {
  return `${conversationPath(basePath, conversation_id)}/visualization`
}
