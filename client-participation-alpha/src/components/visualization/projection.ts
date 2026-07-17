import type { PCAComponents } from '../../api/types'

/** A single vote by the current participant (raw sign: agree = -1, disagree = 1, pass = 0). */
export interface SelfVote {
  tid: number
  vote: number
}

export interface ProjectedPoint {
  x: number
  y: number
}

/**
 * Project the current participant into PCA space from their own votes,
 * mirroring the legacy client's project()/projectSelf()
 * (client-participation/js/stores/polis.js).
 *
 * The result is in the same coordinate space as base-clusters x/y, so it can
 * be passed through the existing visualization scales as-is.
 *
 * Returns null when there is nothing to project (no votes, or PCA components
 * missing/malformed).
 */
export function projectSelf(
  votes: SelfVote[],
  pca: PCAComponents | undefined,
  modOut?: number[]
): ProjectedPoint | null {
  if (votes.length === 0) return null
  if (!pca || !pca.center || !pca.comps || pca.comps.length < 2) return null

  const center = pca.center
  const pcX = pca.comps[0] ?? []
  const pcY = pca.comps[1] ?? []
  const modOutTids = new Set(modOut ?? [])

  let x = 0
  let y = 0
  for (const { tid, vote } of votes) {
    if (modOutTids.has(tid)) continue
    const dx = (vote - (center[tid] || 0)) * (pcX[tid] || 0)
    const dy = (vote - (center[tid] || 0)) * (pcY[tid] || 0)
    if (!Number.isNaN(dx) && !Number.isNaN(dy)) {
      x += dx
      y += dy
    }
  }

  // Sparsity compensation ("jetpack"): scales up participants who have voted
  // on few of the comments. numVotes intentionally counts mod-out votes too,
  // matching the legacy client.
  const numComments = center.length
  const numVotes = votes.length
  if (numComments > 0) {
    const sparsityCompensationFactor = Math.sqrt(numComments / numVotes)
    x *= sparsityCompensationFactor
    y *= sparsityCompensationFactor
  }

  return { x, y }
}
