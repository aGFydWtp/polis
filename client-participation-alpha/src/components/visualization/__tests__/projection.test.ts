import type { PCAComponents } from '../../../api/types'
import { projectSelf, type SelfVote } from '../projection'

describe('projectSelf', () => {
  const pca: PCAComponents = {
    center: [0.5, -0.5, 0],
    comps: [
      [1, 0, 0.5],
      [0, 1, 0.5]
    ]
  }

  it('returns null when there are no votes', () => {
    expect(projectSelf([], pca)).toBeNull()
  })

  it('returns null when PCA components are missing', () => {
    const votes: SelfVote[] = [{ tid: 0, vote: -1 }]

    expect(projectSelf(votes, undefined)).toBeNull()
    expect(projectSelf(votes, { center: [0], comps: [] })).toBeNull()
    expect(projectSelf(votes, { center: [0], comps: [[1]] })).toBeNull()
  })

  it('projects votes onto the first two principal components with sparsity compensation', () => {
    // agree = -1 on tid 0, disagree = 1 on tid 1
    const votes: SelfVote[] = [
      { tid: 0, vote: -1 },
      { tid: 1, vote: 1 }
    ]

    // x = (-1 - 0.5) * 1 + (1 - (-0.5)) * 0 = -1.5
    // y = (-1 - 0.5) * 0 + (1 - (-0.5)) * 1 = 1.5
    // sparsity factor = sqrt(numComments / numVotes) = sqrt(3 / 2)
    const factor = Math.sqrt(3 / 2)
    const result = projectSelf(votes, pca)

    expect(result).not.toBeNull()
    expect(result!.x).toBeCloseTo(-1.5 * factor, 10)
    expect(result!.y).toBeCloseTo(1.5 * factor, 10)
  })

  it('skips mod-out tids but still counts them for sparsity compensation', () => {
    const votes: SelfVote[] = [
      { tid: 0, vote: -1 },
      { tid: 1, vote: 1 }
    ]

    // tid 1 is modded out: only tid 0 contributes, but numVotes stays 2
    // (parity with the legacy client's project()).
    const factor = Math.sqrt(3 / 2)
    const result = projectSelf(votes, pca, [1])

    expect(result).not.toBeNull()
    expect(result!.x).toBeCloseTo(-1.5 * factor, 10)
    expect(result!.y).toBeCloseTo(0, 10)
  })

  it('treats tids beyond the center/comps arrays as zero contributions', () => {
    const votes: SelfVote[] = [
      { tid: 0, vote: -1 },
      { tid: 99, vote: 1 }
    ]

    const factor = Math.sqrt(3 / 2)
    const result = projectSelf(votes, pca)

    expect(result).not.toBeNull()
    expect(result!.x).toBeCloseTo(-1.5 * factor, 10)
    expect(result!.y).toBeCloseTo(0, 10)
  })

  it('a pass vote still pulls away from a non-zero center', () => {
    // pass = 0; with center 0.5 on tid 0 the contribution is (0 - 0.5) * loading
    const votes: SelfVote[] = [{ tid: 0, vote: 0 }]

    const factor = Math.sqrt(3 / 1)
    const result = projectSelf(votes, pca)

    expect(result).not.toBeNull()
    expect(result!.x).toBeCloseTo(-0.5 * factor, 10)
    expect(result!.y).toBeCloseTo(0, 10)
  })
})
