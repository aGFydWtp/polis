import { useEffect, useMemo, useState } from 'react'
import { fetchMyVotes } from '../../api/votes'
import type { SelfVote } from './projection'

/**
 * Track the current participant's own votes for a conversation.
 *
 * Past votes are fetched once on mount (and again when the participant token
 * changes, e.g. right after the first vote creates a participant). New votes
 * are merged in immediately from the polis-vote-submitted event, so the map
 * marker can move without waiting for the math service to recompute.
 */
export function useOwnVotes(conversationId?: string): SelfVote[] {
  const [votesByTid, setVotesByTid] = useState<Map<number, number>>(() => new Map())

  useEffect(() => {
    if (!conversationId) return
    let cancelled = false

    const loadPastVotes = async () => {
      try {
        const rows = await fetchMyVotes(conversationId)
        if (cancelled || !Array.isArray(rows)) return
        setVotesByTid((prev) => {
          const next = new Map(prev)
          rows.forEach((row) => {
            // Votes submitted during this page's lifetime win over fetched ones
            if (typeof row.tid === 'number' && typeof row.vote === 'number' && !next.has(row.tid)) {
              next.set(row.tid, row.vote)
            }
          })
          return next
        })
      } catch (e) {
        console.warn('failed to fetch own votes', e)
      }
    }

    loadPastVotes()

    const handleTokenUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail && detail.conversation_id === conversationId) loadPastVotes()
    }

    const handleVoteSubmitted = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (
        detail &&
        detail.conversation_id === conversationId &&
        typeof detail.tid === 'number' &&
        typeof detail.vote === 'number'
      ) {
        setVotesByTid((prev) => {
          const next = new Map(prev)
          next.set(detail.tid, detail.vote)
          return next
        })
      }
    }

    window.addEventListener('polis-token-update', handleTokenUpdate)
    window.addEventListener('polis-vote-submitted', handleVoteSubmitted)
    return () => {
      cancelled = true
      window.removeEventListener('polis-token-update', handleTokenUpdate)
      window.removeEventListener('polis-vote-submitted', handleVoteSubmitted)
    }
  }, [conversationId])

  return useMemo(() => Array.from(votesByTid, ([tid, vote]) => ({ tid, vote })), [votesByTid])
}
