import { useEffect, useState } from 'react'

/**
 * In production nginx serves this app under `/alpha/` and strips that prefix
 * before the request reaches Astro, so neither SSR nor the router can know the
 * mount point. Recover it in the browser from where the conversation id sits in
 * the current path: `/alpha/9hhmb5fufv` → `/alpha`, `/9hhmb5fufv` → ``.
 */
function mountPath(conversation_id: string): string {
  const path = window.location.pathname.replace(/\/+$/, '')
  const at = path.lastIndexOf(`/${conversation_id}`)
  return at > 0 ? path.slice(0, at) : ''
}

/**
 * Link target for a conversation page (`suffix` appended, e.g.
 * `/visualization`), prefixed with the mount point once mounted. Renders the
 * unprefixed path on the server so hydration matches, then corrects it.
 */
export function useConversationPath(conversation_id: string, suffix = ''): string {
  const [path, setPath] = useState(`/${conversation_id}${suffix}`)
  useEffect(() => {
    setPath(`${mountPath(conversation_id)}/${conversation_id}${suffix}`)
  }, [conversation_id, suffix])
  return path
}
