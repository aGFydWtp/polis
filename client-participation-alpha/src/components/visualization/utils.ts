import type { GroupVotes } from '../../api/types'

export interface VoteCounts {
  agree: number
  disagree: number
  pass: number
  /** Total members who voted on the statement (agree + disagree + pass). */
  total: number
}

/**
 * Converts a raw math-service vote entry into explicit counts.
 * In the group-votes structure, S ("saw") is the TOTAL number of members who
 * voted on the comment — not the pass count. The pass count is S - A - D.
 */
export function toVoteCounts(votes: { A: number; D: number; S: number }): VoteCounts {
  const agree = votes.A
  const disagree = votes.D
  const total = votes.S
  return { agree, disagree, pass: Math.max(0, total - agree - disagree), total }
}

/**
 * Aggregates a statement's vote counts across all groups.
 */
export function aggregateGroupVotesForTid(
  groupVotes: { [groupId: string]: GroupVotes },
  tid: string
): VoteCounts {
  let agree = 0
  let disagree = 0
  let total = 0
  Object.values(groupVotes).forEach((g) => {
    const votes = g.votes[tid]
    if (votes) {
      agree += votes.A
      disagree += votes.D
      total += votes.S
    }
  })
  return { agree, disagree, pass: Math.max(0, total - agree - disagree), total }
}

/**
 * Helper function to select top consensus items
 * Handles items with tied scores by including all tied items, up to a tolerance
 */
export function selectTopConsensusItems(
  data: Record<string, number>,
  targetCount: number = 5,
  maxExcess: number = 10
): string[] {
  // Convert to array and sort descending by score
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1])

  const selectedTids: string[] = []
  let i = 0

  while (i < entries.length) {
    // If we already have enough items, stop
    if (selectedTids.length >= targetCount) {
      break
    }

    const currentScore = entries[i][1]
    const candidates: string[] = []

    // Collect all items with the same score (using epsilon for float comparison)
    let j = i
    while (j < entries.length && Math.abs(entries[j][1] - currentScore) < Number.EPSILON) {
      candidates.push(entries[j][0])
      j++
    }

    // Check if adding these candidates would exceed the limit
    // We allow exceeding if it's the very first group (to ensure we show something)
    // or if the total count is within tolerance
    if (
      selectedTids.length === 0 ||
      selectedTids.length + candidates.length <= targetCount + maxExcess
    ) {
      selectedTids.push(...candidates)
      i = j
    } else {
      // If adding this group exceeds the limit and we already have items, stop here
      break
    }
  }

  return selectedTids
}
