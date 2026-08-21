import { act, renderHook, waitFor } from '@testing-library/react'
import { fetchNextComment } from '../../../api/comments'
import type { NextCommentResponse } from '../../../api/types'
import { submitVote } from '../../../api/votes'
import {
  markReturnedFromVisualization,
  redirectToVisualization
} from '../../../lib/visualizationRedirect'
import type { Translations } from '../../../strings/types'
import type { StatementData } from '../../types'
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
// jsdom refuses to navigate, so only the navigation call is stubbed; the
// sessionStorage flag and the predicate stay real.
jest.mock('../../../lib/visualizationRedirect', () => ({
  ...jest.requireActual('../../../lib/visualizationRedirect'),
  redirectToVisualization: jest.fn()
}))

const mockedFetchNextComment = fetchNextComment as jest.MockedFunction<typeof fetchNextComment>
const mockedSubmitVote = submitVote as jest.MockedFunction<typeof submitVote>

const s = {} as Translations

/** A promise whose resolution the test controls, to order two async paths. */
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

const noStatement = { txt: '' } as NextCommentResponse
const openStatement = { tid: 3, txt: 'a statement', remaining: 1 } as NextCommentResponse

const replace = redirectToVisualization as jest.MockedFunction<typeof redirectToVisualization>

beforeEach(() => {
  jest.clearAllMocks()
  window.sessionStorage.clear()
})

const baseArgs = {
  conversation_id: '9zdemo',
  s,
  visualizationEnabled: true,
  visualizationHref: '/alpha/9zdemo/visualization'
}

describe('useVotingScreen — all-answered redirect', () => {
  it('redirects when the first fetch comes back without a statement', async () => {
    mockedFetchNextComment.mockResolvedValue(noStatement)

    const { result } = renderHook(() => useVotingScreen(baseArgs))

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/alpha/9zdemo/visualization'))
    expect(result.current.isRedirectingToVisualization).toBe(true)
  })

  it('does not redirect when a statement is still open', async () => {
    mockedFetchNextComment.mockResolvedValue(openStatement)

    const { result } = renderHook(() => useVotingScreen(baseArgs))

    await waitFor(() => expect(result.current.statement?.tid).toBe(3))
    expect(replace).not.toHaveBeenCalled()
  })

  it('does not redirect when the conversation has no visualization', async () => {
    mockedFetchNextComment.mockResolvedValue(noStatement)

    const { result } = renderHook(() =>
      useVotingScreen({ ...baseArgs, visualizationEnabled: false })
    )

    await waitFor(() => expect(result.current.allDone).toBe(true))
    expect(replace).not.toHaveBeenCalled()
    expect(result.current.isRedirectingToVisualization).toBe(false)
  })

  it('does not redirect after the visualization back button was used', async () => {
    markReturnedFromVisualization('9zdemo')
    mockedFetchNextComment.mockResolvedValue(noStatement)

    const { result } = renderHook(() => useVotingScreen(baseArgs))

    await waitFor(() => expect(result.current.allDone).toBe(true))
    expect(replace).not.toHaveBeenCalled()
  })

  it('does not redirect on the view-only visualization page', async () => {
    const { result } = renderHook(() => useVotingScreen({ ...baseArgs, votingEnabled: false }))

    await waitFor(() => expect(result.current.notDone).toBe(false))
    expect(mockedFetchNextComment).not.toHaveBeenCalled()
    expect(replace).not.toHaveBeenCalled()
  })

  it('shows the done card instead of redirecting when the last statement is voted away', async () => {
    mockedFetchNextComment.mockResolvedValue(openStatement)
    mockedSubmitVote.mockResolvedValue({})

    const { result } = renderHook(() => useVotingScreen(baseArgs))
    await waitFor(() => expect(result.current.statement?.tid).toBe(3))

    await act(async () => {
      await result.current.vote(-1)
    })

    await waitFor(() => expect(result.current.allDone).toBe(true))
    expect(replace).not.toHaveBeenCalled()
    expect(result.current.isRedirectingToVisualization).toBe(false)
  })

  it('does not redirect when the vote lands before a slow first fetch resolves', async () => {
    // The SSR statement is votable straight after hydration, so a participant
    // on a slow connection can answer it while /nextComment is still in
    // flight. The late "nothing left" response must not yank them off the
    // done card.
    const firstFetch = deferred<NextCommentResponse>()
    mockedFetchNextComment.mockReturnValue(firstFetch.promise)
    mockedSubmitVote.mockResolvedValue({})

    const ssrStatement: StatementData = { tid: 3, txt: 'a statement', remaining: 1 }
    const { result } = renderHook(() =>
      useVotingScreen({ ...baseArgs, initialStatement: ssrStatement })
    )

    await act(async () => {
      await result.current.vote(-1)
    })
    expect(result.current.allDone).toBe(true)

    await act(async () => {
      firstFetch.resolve(noStatement)
      await firstFetch.promise
    })

    expect(replace).not.toHaveBeenCalled()
    expect(result.current.isRedirectingToVisualization).toBe(false)
    expect(result.current.allDone).toBe(true)
  })
})
