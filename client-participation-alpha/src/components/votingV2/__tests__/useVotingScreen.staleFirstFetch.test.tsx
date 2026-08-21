/**
 * The first /nextComment fetch races with voting: the SSR statement is votable
 * from hydration onwards, so a participant can answer it — and the server can
 * answer back — while that fetch is still in flight. Its response is stale by
 * then and must not be applied on top of the vote's result.
 *
 * Redirect gating for the same race lives in useVotingScreen.redirect.test.tsx;
 * this file is only about the statement and progress state.
 */
import { act, renderHook, waitFor } from '@testing-library/react'
import { fetchNextComment } from '../../../api/comments'
import type { NextCommentResponse } from '../../../api/types'
import { submitVote } from '../../../api/votes'
import type { Translations } from '../../../strings/types'
import type { StatementData, VoteResponse } from '../../types'
import { useVotingScreen } from '../useVotingScreen'

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

/** A promise whose resolution the test controls, to order two async paths. */
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

/** What the SSR pass handed down; already answered, but the client can't tell. */
const ssrStatement: StatementData = { tid: 3, txt: 'the SSR statement', remaining: 5 }
/** The stale first-fetch response: issued before the vote, so it repeats tid 3. */
const staleFetch = {
  tid: 3,
  txt: 'the SSR statement',
  remaining: 5,
  total: 99
} as NextCommentResponse
const nothingLeft = { txt: '' } as NextCommentResponse
/** The vote's own response — always the newer truth. */
const votedOn = {
  nextComment: { tid: 7, txt: 'the next statement', remaining: 4, total: 10 }
} as VoteResponse

const baseArgs = {
  conversation_id: '9zdemo',
  s: {} as Translations,
  initialStatement: ssrStatement
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('useVotingScreen — stale first fetch', () => {
  it('keeps the voted-to statement when the first fetch resolves afterwards', async () => {
    const firstFetch = deferred<NextCommentResponse>()
    mockedFetchNextComment.mockReturnValue(firstFetch.promise)
    mockedSubmitVote.mockResolvedValue(votedOn)

    const { result } = renderHook(() => useVotingScreen(baseArgs))

    await act(async () => {
      await result.current.vote(-1)
    })
    expect(result.current.statement?.tid).toBe(7)

    await act(async () => {
      firstFetch.resolve(staleFetch)
      await firstFetch.promise
    })

    // Without the guard, the stale tid 3 would be shown again — the statement
    // the participant just answered.
    expect(result.current.statement?.tid).toBe(7)
    expect(result.current.total).toBe(10)
    expect(result.current.remaining).toBe(4)
  })

  it('does not blank the statement when a stale "nothing left" response arrives', async () => {
    const firstFetch = deferred<NextCommentResponse>()
    mockedFetchNextComment.mockReturnValue(firstFetch.promise)
    mockedSubmitVote.mockResolvedValue(votedOn)

    const { result } = renderHook(() => useVotingScreen(baseArgs))

    await act(async () => {
      await result.current.vote(-1)
    })

    await act(async () => {
      firstFetch.resolve(nothingLeft)
      await firstFetch.promise
    })

    expect(result.current.statement?.tid).toBe(7)
    expect(result.current.allDone).toBe(false)
  })

  it('still applies the first fetch when no vote has been cast', async () => {
    const firstFetch = deferred<NextCommentResponse>()
    mockedFetchNextComment.mockReturnValue(firstFetch.promise)

    const { result } = renderHook(() => useVotingScreen(baseArgs))
    expect(result.current.statement?.tid).toBe(3)

    await act(async () => {
      firstFetch.resolve({
        tid: 7,
        txt: 'the personalized statement',
        remaining: 4,
        total: 10
      } as NextCommentResponse)
      await firstFetch.promise
    })

    await waitFor(() => expect(result.current.statement?.tid).toBe(7))
    expect(result.current.total).toBe(10)
    expect(result.current.remaining).toBe(4)
  })

  it('marks the first load as done even when the response is discarded', async () => {
    const firstFetch = deferred<NextCommentResponse>()
    mockedFetchNextComment.mockReturnValue(firstFetch.promise)
    mockedSubmitVote.mockResolvedValue({} as VoteResponse)

    const { result } = renderHook(() => useVotingScreen(baseArgs))

    await act(async () => {
      await result.current.vote(-1)
    })

    await act(async () => {
      firstFetch.resolve(staleFetch)
      await firstFetch.promise
    })

    // The vote emptied the queue; the discarded response must not stop
    // `allDone` from settling.
    expect(result.current.statement).toBeUndefined()
    expect(result.current.allDone).toBe(true)
  })
})
