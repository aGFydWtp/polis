/**
 * Two statements in a row are answered from the same three coordinates, so the
 * second tap of a double-tap lands on a statement the participant has not read.
 * The guard that stops it has to outlive the card it was armed on, which is why
 * it sits in this hook rather than in the card component — these tests pin that
 * down across the swap.
 */
import { act, renderHook } from '@testing-library/react'
import { fetchNextComment } from '../../../api/comments'
import { submitVote } from '../../../api/votes'
import type { Translations } from '../../../strings/types'
import type { StatementData, VoteResponse } from '../../types'
import { useVotingScreen } from '../useVotingScreen'
import { VOTE_GUARD_MS } from '../voteTransition'

// Explicit factories: the real API modules pull in lib/net, which uses
// import.meta and cannot be loaded under ts-jest's CommonJS transform.
jest.mock('../../../api/comments', () => ({
  fetchComments: jest.fn(),
  fetchNextComment: jest.fn()
}))
jest.mock('../../../api/pca', () => ({ fetchPCAData: jest.fn() }))
jest.mock('../../../api/votes', () => ({ submitVote: jest.fn(), fetchMyVotes: jest.fn() }))
jest.mock('../../../lib/auth', () => ({ getConversationToken: jest.fn(() => null) }))
// Same reason: it pulls in concaveman, which ships untransformed ESM.
jest.mock('../../visualization/useVisualizationData', () => ({
  useVisualizationData: () => ({ hulls: [], statements: [], groupVoteData: [] })
}))

const mockedFetchNextComment = fetchNextComment as jest.MockedFunction<typeof fetchNextComment>
const mockedSubmitVote = submitVote as jest.MockedFunction<typeof submitVote>

const ssrStatement: StatementData = { tid: 3, txt: 'the first statement', remaining: 5 }

const baseArgs = {
  conversation_id: '9zdemo',
  s: {} as Translations,
  initialStatement: ssrStatement
}

/** Every vote hands back another statement, so the buttons never run out. */
const nextComment = (tid: number) =>
  ({ nextComment: { tid, txt: `statement ${tid}`, remaining: 4, total: 10 } }) as VoteResponse

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

beforeEach(() => {
  jest.clearAllMocks()
  // Never resolves: the personalized first fetch is not what these tests are about.
  mockedFetchNextComment.mockReturnValue(new Promise(() => {}))
  let tid = 7
  mockedSubmitVote.mockImplementation(async () => nextComment(tid++))
})

describe('useVotingScreen — cross-card input guard', () => {
  it('ignores a tap that arrives while the previous vote is still resolving', async () => {
    const { result } = renderHook(() => useVotingScreen(baseArgs))

    await act(async () => {
      const first = result.current.vote(-1)
      await result.current.vote(1)
      await first
    })

    expect(mockedSubmitVote).toHaveBeenCalledTimes(1)
  })

  it('ignores a tap on the card that has just replaced the answered one', async () => {
    const { result } = renderHook(() => useVotingScreen(baseArgs))

    await act(async () => {
      await result.current.vote(-1)
    })
    expect(result.current.statement?.tid).toBe(7)

    // The reflex second tap: the buttons are back under the finger, but the
    // statement above them is new.
    await act(async () => {
      await result.current.vote(-1)
    })

    expect(mockedSubmitVote).toHaveBeenCalledTimes(1)
    expect(result.current.statement?.tid).toBe(7)
  })

  it('accepts the next tap once the guard window has passed', async () => {
    const { result } = renderHook(() => useVotingScreen(baseArgs))

    await act(async () => {
      await result.current.vote(-1)
    })
    await act(async () => {
      await wait(VOTE_GUARD_MS + 30)
    })
    expect(result.current.inputLocked).toBe(false)

    await act(async () => {
      await result.current.vote(-1)
    })

    expect(mockedSubmitVote).toHaveBeenCalledTimes(2)
    expect(result.current.statement?.tid).toBe(8)
  })

  it('lets a keyboard vote through the window a tap is held back by', async () => {
    const { result } = renderHook(() => useVotingScreen(baseArgs))

    await act(async () => {
      await result.current.vote(-1, 'keyboard')
    })
    await act(async () => {
      await result.current.vote(-1, 'keyboard')
    })

    expect(mockedSubmitVote).toHaveBeenCalledTimes(2)
    expect(result.current.statement?.tid).toBe(8)
  })
})
