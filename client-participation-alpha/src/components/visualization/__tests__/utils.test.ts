import type { GroupVotes } from '../../../api/types'
import { aggregateGroupVotesForTid, selectTopConsensusItems, toVoteCounts } from '../utils'

describe('visualization utils', () => {
  describe('toVoteCounts', () => {
    it('treats S as the total voter count and derives pass as S - A - D', () => {
      const counts = toVoteCounts({ A: 5, D: 3, S: 10 })

      expect(counts).toEqual({ agree: 5, disagree: 3, pass: 2, total: 10 })
    })

    it('returns zero pass when everyone agreed or disagreed', () => {
      const counts = toVoteCounts({ A: 7, D: 3, S: 10 })

      expect(counts.pass).toBe(0)
      expect(counts.total).toBe(10)
    })

    it('clamps pass at zero for inconsistent input', () => {
      const counts = toVoteCounts({ A: 8, D: 4, S: 10 })

      expect(counts.pass).toBe(0)
    })
  })

  describe('aggregateGroupVotesForTid', () => {
    const groupVotes: { [groupId: string]: GroupVotes } = {
      '0': { 'n-members': 12, votes: { '42': { A: 6, D: 2, S: 9 } } },
      '1': { 'n-members': 8, votes: { '42': { A: 3, D: 4, S: 7 } } }
    }

    it('sums A, D, and S across groups and derives pass from the totals', () => {
      const counts = aggregateGroupVotesForTid(groupVotes, '42')

      // A = 6+3, D = 2+4, S (total voters) = 9+7, pass = 16 - 9 - 6
      expect(counts).toEqual({ agree: 9, disagree: 6, pass: 1, total: 16 })
    })

    it('produces percentages that reflect S as total, not as pass count', () => {
      const { agree, disagree, pass, total } = aggregateGroupVotesForTid(groupVotes, '42')

      // The old S-as-pass bug rendered 29%/19%/52% for these counts.
      expect(Math.round((agree / total) * 100)).toBe(56)
      expect(Math.round((disagree / total) * 100)).toBe(38)
      expect(Math.round((pass / total) * 100)).toBe(6)
    })

    it('skips groups that have no entry for the tid', () => {
      const sparse: { [groupId: string]: GroupVotes } = {
        '0': { 'n-members': 5, votes: { '42': { A: 2, D: 1, S: 4 } } },
        '1': { 'n-members': 3, votes: {} }
      }

      const counts = aggregateGroupVotesForTid(sparse, '42')

      expect(counts).toEqual({ agree: 2, disagree: 1, pass: 1, total: 4 })
    })

    it('returns zeros when no group voted on the tid', () => {
      const counts = aggregateGroupVotesForTid(groupVotes, '999')

      expect(counts).toEqual({ agree: 0, disagree: 0, pass: 0, total: 0 })
    })
  })

  describe('selectTopConsensusItems', () => {
    it('should select top items up to target count', () => {
      const data = {
        tid1: 10,
        tid2: 8,
        tid3: 6,
        tid4: 4,
        tid5: 2
      }

      const result = selectTopConsensusItems(data, 3)

      expect(result).toEqual(['tid1', 'tid2', 'tid3'])
      expect(result).toHaveLength(3)
    })

    it('should use default target count of 5', () => {
      const data = {
        tid1: 10,
        tid2: 9,
        tid3: 8,
        tid4: 7,
        tid5: 6,
        tid6: 5,
        tid7: 4
      }

      const result = selectTopConsensusItems(data)

      expect(result).toEqual(['tid1', 'tid2', 'tid3', 'tid4', 'tid5'])
      expect(result).toHaveLength(5)
    })

    it('should include all tied items within tolerance', () => {
      const data = {
        tid1: 10,
        tid2: 8,
        tid3: 8,
        tid4: 8,
        tid5: 5
      }

      const result = selectTopConsensusItems(data, 2)

      // Should include tid1 and all items tied at 8
      expect(result).toEqual(['tid1', 'tid2', 'tid3', 'tid4'])
      expect(result).toHaveLength(4)
    })

    it('should include all tied items when they are the first group', () => {
      const data = {}
      // Create 20 items all with score 10
      for (let i = 1; i <= 20; i++) {
        data[`tid${i}`] = 10
      }

      const result = selectTopConsensusItems(data, 5, 10)

      // Should include all 20 since they're all tied and it's the first group
      expect(result).toHaveLength(20)
    })

    it('should include first group even if exceeds limits', () => {
      const data = {}
      // Create 20 items all with same score
      for (let i = 1; i <= 20; i++) {
        data[`tid${i}`] = 100
      }

      const result = selectTopConsensusItems(data, 2, 3)

      // Should include all 20 since they're all tied and it's the first group
      expect(result).toHaveLength(20)
    })

    it('should handle empty data', () => {
      const result = selectTopConsensusItems({}, 5)

      expect(result).toEqual([])
      expect(result).toHaveLength(0)
    })

    it('should handle single item', () => {
      const data = { tid1: 42 }

      const result = selectTopConsensusItems(data, 5)

      expect(result).toEqual(['tid1'])
      expect(result).toHaveLength(1)
    })

    it('should handle negative scores', () => {
      const data = {
        tid1: -5,
        tid2: -10,
        tid3: -2,
        tid4: -20
      }

      const result = selectTopConsensusItems(data, 2)

      expect(result).toEqual(['tid3', 'tid1'])
      expect(result).toHaveLength(2)
    })

    it('should handle mixed positive and negative scores', () => {
      const data = {
        tid1: 5,
        tid2: -10,
        tid3: 3,
        tid4: 0,
        tid5: -5
      }

      const result = selectTopConsensusItems(data, 3)

      expect(result).toEqual(['tid1', 'tid3', 'tid4'])
      expect(result).toHaveLength(3)
    })

    it('should handle floating point scores with epsilon comparison', () => {
      const data = {
        tid1: 10.0,
        tid2: 10.0 + Number.EPSILON / 2, // Should be considered equal
        tid3: 9.9999,
        tid4: 8.0
      }

      const result = selectTopConsensusItems(data, 1)

      // Should include both tid1 and tid2 as they're within epsilon
      expect(result).toContain('tid1')
      expect(result).toContain('tid2')
      expect(result).toHaveLength(2)
    })

    it('should sort items correctly by descending score', () => {
      const data = {
        tid1: 3,
        tid2: 1,
        tid3: 5,
        tid4: 2,
        tid5: 4
      }

      const result = selectTopConsensusItems(data, 3)

      expect(result).toEqual(['tid3', 'tid5', 'tid1'])
    })

    it('should handle zero scores', () => {
      const data = {
        tid1: 0,
        tid2: 0,
        tid3: 0,
        tid4: -1
      }

      const result = selectTopConsensusItems(data, 2)

      // Should include all items with score 0 (tied for top)
      expect(result).toEqual(['tid1', 'tid2', 'tid3'])
      expect(result).toHaveLength(3)
    })
  })
})
