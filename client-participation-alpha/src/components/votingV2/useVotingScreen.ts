import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchComments, fetchNextComment } from '../../api/comments'
import { fetchPCAData } from '../../api/pca'
import type { Comment, PCAData } from '../../api/types'
import { submitVote } from '../../api/votes'
import { getConversationToken } from '../../lib/auth'
import {
  hasReturnedFromVisualization,
  redirectToVisualization,
  shouldRedirectToVisualization
} from '../../lib/visualizationRedirect'
import type { Translations } from '../../strings/types'
import type { StatementData, VoteData } from '../types'
import { groupLetters, REFRESH_DELAY_MS } from '../visualization/constants'
import type { SelectedStatement, StatementContext, StatementWithType } from '../visualization/types'
import { useOwnVotes } from '../visualization/useOwnVotes'
import { useVisualizationData } from '../visualization/useVisualizationData'
import { aggregateGroupVotesForTid, selectTopConsensusItems } from '../visualization/utils'

/**
 * Vote values (raw sign, matching the server / Survey.tsx convention):
 *   Agree = -1, Disagree = 1, Pass/Hold = 0
 */
export const VOTE_AGREE = -1
export const VOTE_DISAGREE = 1
export const VOTE_HOLD = 0

export interface GroupInfo {
  groupId: number
  /** Display letter (A, B, C, ...) */
  name: string
  /** Participant count in this group */
  count: number
}

/** One representative comment shown on a group's profile card. */
export interface GroupRepComment {
  text: string
  /** Whether the group's votes make this comment representative by agreeing or disagreeing. */
  stance: 'agree' | 'disagree'
}

/** One group's representative-comment card data (per-group profile section). */
export interface GroupProfile {
  groupId: number
  /** Display letter (A, B, C, ...) */
  name: string
  /** Participant count in this group */
  count: number
  /** Top representative comments for this group, ranked. */
  repComments: GroupRepComment[]
}

export interface StatChip {
  tid: number
  type: 'agree' | 'disagree'
  /** 1-based index used purely for the chip label */
  label: number
}

/** One cross-group consensus statement for the みんなの共通意見 (6d) donut cards. */
export interface ConsensusStatement {
  tid: number
  text: string
  /** Total vote counts aggregated across all groups. */
  agree: number
  disagree: number
  pass: number
  /** Percentages of all votes (0-100, rounded). */
  agreePct: number
  disagreePct: number
  passPct: number
}

/** One group's agreed-opinions section (same card layout as the consensus section). */
export interface GroupConsensus {
  groupId: number
  /** Display letter (A, B, C, ...) */
  name: string
  /** Statements the group has a clear majority on (agree or disagree), ranked by majority rate. */
  items: ConsensusStatement[]
}

export interface StatSummary {
  /** Statement id (tid) */
  num: number
  /** Statement text */
  text: string
  /** Percentage agreeing/disagreeing (0-100, rounded) */
  pct: number
  /** 'agree' | 'disagree' — drives icon/color and stance label */
  stance: 'agree' | 'disagree'
}

interface UseVotingScreenArgs {
  conversation_id: string
  initialStatement?: StatementData
  /** vis_type from the conversation; opinion groups only render when === 1 */
  visType?: number
  /** Translations, used to resolve vote-failure messages. */
  s: Translations
  /**
   * When false, skips fetching the personalized next statement — used by the
   * view-only /:id/visualization page, which never votes.
   */
  votingEnabled?: boolean
  /**
   * Whether /:id/visualization is reachable (vis_type === 1). Gates the
   * "already answered everything" redirect only; the opinion-group map on this
   * hook is gated by `visType` above.
   */
  visualizationEnabled?: boolean
  /** Target of that redirect — see `paths.ts#visualizationPath`. */
  visualizationHref?: string
}

/** Maps a vote-submission error to a user-facing message (mirrors Survey.tsx). */
function resolveVoteError(err: unknown, s: Translations): string {
  const error = err as { responseText?: string; message?: string }
  const errorText = error.responseText || error.message || ''
  if (errorText.includes('polis_err_conversation_is_closed')) return s.convIsClosed
  if (errorText.includes('polis_err_post_votes_social_needed')) return s.signInToVote
  if (errorText.includes('polis_err_xid_not_allowed')) return s.xidRequired
  if (errorText.includes('polis_err_xid_required')) return s.xidRequired
  return s.voteFailedGeneric
}

const submitVoteAndGetNext = async (vote: VoteData, conversation_id: string) => {
  const decodedToken = getConversationToken(conversation_id)
  const resp = await submitVote({
    agid: 1,
    conversation_id,
    high_priority: false,
    pid: decodedToken?.pid || -1,
    tid: vote.tid,
    vote: vote.vote
  })

  // Notify the map/visualization data to refetch after a short delay.
  // tid/vote let listeners update the client-side position projection immediately.
  window.dispatchEvent(
    new CustomEvent('polis-vote-submitted', {
      detail: { conversation_id, tid: vote.tid, vote: vote.vote }
    })
  )

  return resp
}

export function useVotingScreen({
  conversation_id,
  initialStatement,
  visType,
  s,
  votingEnabled = true,
  visualizationEnabled = false,
  visualizationHref
}: UseVotingScreenArgs) {
  // ── Voting state ──────────────────────────────────────────────
  const [statement, setStatement] = useState<StatementData | undefined>(initialStatement)
  const [isFetchingNext, setIsFetchingNext] = useState(false)
  const [voteError, setVoteError] = useState<string | null>(null)
  const [total, setTotal] = useState<number | undefined>(undefined)
  // Distinguish "still loading first comment" from "genuinely done".
  const [hasLoadedFirst, setHasLoadedFirst] = useState<boolean>(!!initialStatement)
  // Set once a redirect to /:id/visualization has been started; keeps the
  // "all answered" card from flashing while the browser navigates away.
  const [isRedirectingToVisualization, setIsRedirectingToVisualization] = useState(false)

  // Flipped the moment a vote is *submitted*, not when it resolves: it marks
  // the point after which the in-flight first fetch below is stale. Waiting
  // for completion would leave the whole request window unguarded — exactly
  // when the two races overlap. A ref (not state) because only the async
  // callbacks below read it: no re-render is needed and the load effect's deps
  // stay clean.
  const hasVotedRef = useRef(false)

  // ── PCA / map state ───────────────────────────────────────────
  const [pcaData, setPcaData] = useState<PCAData | null>(null)
  const [comments, setComments] = useState<Comment[] | null>(null)
  const currentMathTick = useRef<number | undefined>(undefined)
  const refetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Selection state (lifted from PCAVisualization) ────────────
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null)
  const [isConsensusSelected, setIsConsensusSelected] = useState(false)
  const [selectedStatement, setSelectedStatement] = useState<SelectedStatement | null>(null)
  const [userPid, setUserPid] = useState<number | null>(null)

  // ── Personalized first comment (mirrors Survey.tsx) ───────────
  useEffect(() => {
    if (!votingEnabled) return
    let cancelled = false
    const loadFirst = async () => {
      try {
        const resp = await fetchNextComment(conversation_id)
        if (cancelled) return
        // This request was issued before any vote, so the vote's own response
        // is by definition newer: once one has been submitted, everything
        // below is stale. Applying it anyway would put the just-answered
        // statement back on screen (and roll `total` back), or redirect a
        // participant who has earned the done card. `cancelled` can't express
        // this — it only fires on unmount and dependency changes.
        if (hasVotedRef.current) return
        const hasNextStatement = !!resp && typeof resp.tid !== 'undefined'
        // Everything was already answered before this page was opened (SSR
        // can't tell: its participationInit is anonymous, so it always hands
        // down a statement). Send the participant on to the visualization
        // rather than showing them the "all answered" card they'd have to
        // click through.
        if (
          visualizationHref &&
          shouldRedirectToVisualization({
            votingEnabled,
            visualizationEnabled,
            hasNextStatement,
            returnedFromVisualization: hasReturnedFromVisualization(conversation_id)
          })
        ) {
          setIsRedirectingToVisualization(true)
          redirectToVisualization(visualizationHref)
          return
        }
        if (resp && hasNextStatement) {
          setStatement((prev) => {
            const mapped: StatementData = {
              tid: resp.tid as number,
              txt: resp.txt,
              remaining: resp.remaining,
              lang: resp.lang,
              translations: resp.translations
            }
            return !prev || mapped.tid !== prev.tid ? mapped : prev
          })
          if (typeof resp.total === 'number') setTotal(resp.total)
        } else {
          setStatement(undefined)
        }
      } catch (e) {
        console.warn('v2: personalized first comment fetch failed', e)
      } finally {
        if (!cancelled) setHasLoadedFirst(true)
      }
    }
    loadFirst()
    return () => {
      cancelled = true
    }
  }, [conversation_id, votingEnabled, visualizationEnabled, visualizationHref])

  // ── User pid for the map indicator ────────────────────────────
  useEffect(() => {
    const updatePid = () => {
      const token = getConversationToken(conversation_id)
      if (token && typeof token.pid === 'number' && token.pid >= 0) {
        setUserPid(token.pid)
      } else {
        setUserPid(null)
      }
    }
    updatePid()
    const handleTokenUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail && detail.conversation_id === conversation_id) updatePid()
    }
    window.addEventListener('polis-token-update', handleTokenUpdate)
    return () => window.removeEventListener('polis-token-update', handleTokenUpdate)
  }, [conversation_id])

  // ── PCA data load + refetch-on-vote (mirrors VisualizationContainer) ──
  const groupsEnabled = visType === 1
  const loadPca = useCallback(async () => {
    if (!groupsEnabled) return
    try {
      const pcaKeys: Array<keyof PCAData> = [
        'base-clusters',
        'group-clusters',
        'group-aware-consensus',
        'group-votes',
        'repness',
        'pca',
        'mod-out',
        'mathTick'
      ]
      const [pca, cmts] = await Promise.all([
        fetchPCAData(conversation_id, pcaKeys),
        fetchComments(conversation_id)
      ])
      if (pca.mathTick !== undefined && pca.mathTick === currentMathTick.current) return
      currentMathTick.current = pca.mathTick
      setPcaData(pca)
      setComments(cmts)
    } catch (e) {
      console.warn('v2: PCA fetch failed', e)
    }
  }, [conversation_id, groupsEnabled])

  useEffect(() => {
    loadPca()
  }, [loadPca])

  useEffect(() => {
    if (!groupsEnabled) return
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail && detail.conversation_id === conversation_id) {
        if (refetchTimeoutRef.current) clearTimeout(refetchTimeoutRef.current)
        refetchTimeoutRef.current = setTimeout(() => loadPca(), REFRESH_DELAY_MS)
      }
    }
    window.addEventListener('polis-vote-submitted', onChange)
    window.addEventListener('polis-comment-submitted', onChange)
    return () => {
      window.removeEventListener('polis-vote-submitted', onChange)
      window.removeEventListener('polis-comment-submitted', onChange)
      if (refetchTimeoutRef.current) clearTimeout(refetchTimeoutRef.current)
    }
  }, [conversation_id, groupsEnabled, loadPca])

  // ── Derived visualization data (reuses existing hook) ─────────
  const hasPca = !!pcaData && (pcaData['group-clusters']?.length ?? 0) > 0
  const emptyPca: PCAData = useMemo(
    () => ({ 'base-clusters': { x: [], y: [], id: [], count: [] }, 'group-clusters': [] }),
    []
  )
  const ownVotes = useOwnVotes(conversation_id)

  const viz = useVisualizationData(
    hasPca ? (pcaData as PCAData) : emptyPca,
    selectedGroup,
    isConsensusSelected,
    selectedStatement?.tid ?? null,
    userPid,
    ownVotes
  )

  const groups: GroupInfo[] = useMemo(
    () =>
      viz.hulls.map((h) => ({
        groupId: h.groupId,
        name: groupLetters[h.groupId] ?? String(h.groupId + 1),
        count: h.participantCount
      })),
    [viz.hulls]
  )

  // Comment text lookup for chips/stat
  const commentText = useCallback(
    (tid: number) => comments?.find((c) => c.tid === tid)?.txt ?? '',
    [comments]
  )

  // ── Per-group representative-comment profiles (opinion-group cards) ───
  const groupProfiles: GroupProfile[] = useMemo(() => {
    const repness = pcaData?.repness
    if (!repness || !comments) return []
    return groups.map((g) => {
      const items = repness[g.groupId.toString()] ?? []
      const repComments: GroupRepComment[] = []
      for (const item of items) {
        if (repComments.length >= 3) break
        const text = comments.find((c) => c.tid === item.tid)?.txt
        if (text) repComments.push({ text, stance: item['repful-for'] })
      }
      return { groupId: g.groupId, name: g.name, count: g.count, repComments }
    })
  }, [groups, pcaData, comments])

  const chips: StatChip[] = useMemo(
    () =>
      viz.statements.map((st: StatementWithType, i) => ({
        tid: st.tid,
        type: st.type,
        label: i + 1
      })),
    [viz.statements]
  )

  // Stat card for the currently selected statement
  const stat: StatSummary | null = useMemo(() => {
    if (!selectedStatement) return null
    const stance = selectedStatement.type
    // Aggregate agree/disagree across the relevant scope.
    let agree = 0
    let disagree = 0
    if (selectedStatement.context === 'consensus') {
      viz.groupVoteData.forEach((g) => {
        agree += g.agree
        disagree += g.disagree
      })
    } else {
      const gid = selectedStatement.context.groupId
      const g = viz.groupVoteData.find((v) => v.groupId === gid)
      if (g) {
        agree = g.agree
        disagree = g.disagree
      }
    }
    const denom = agree + disagree
    const pct = denom > 0 ? Math.round(((stance === 'agree' ? agree : disagree) / denom) * 100) : 0
    return { num: selectedStatement.tid, text: commentText(selectedStatement.tid), pct, stance }
  }, [selectedStatement, viz.groupVoteData, commentText])

  // ── Cross-group consensus statements (みんなの共通意見, 6d) ──────
  const consensusItems: ConsensusStatement[] = useMemo(() => {
    const consensusScores = pcaData?.['group-aware-consensus']
    const groupVotes = pcaData?.['group-votes']
    if (!hasPca || !consensusScores || !groupVotes || !comments) return []

    const items: ConsensusStatement[] = []
    selectTopConsensusItems(consensusScores).forEach((tidStr) => {
      const tid = parseInt(tidStr, 10)
      const comment = comments.find((c) => c.tid === tid)
      if (!comment) return

      const { agree, disagree, pass, total } = aggregateGroupVotesForTid(groupVotes, tidStr)
      if (total === 0) return

      items.push({
        tid,
        text: comment.txt,
        agree,
        disagree,
        pass,
        agreePct: Math.round((agree / total) * 100),
        disagreePct: Math.round((disagree / total) * 100),
        passPct: Math.round((pass / total) * 100)
      })
    })
    return items
  }, [hasPca, pcaData, comments])

  // ── Per-group agreed opinions (グループ◯で同意されている意見) ──────
  const groupConsensusItems: GroupConsensus[] = useMemo(() => {
    const groupVotes = pcaData?.['group-votes']
    if (!hasPca || !groupVotes || !comments) return []

    return Object.entries(groupVotes)
      .map(([gidStr, g]) => {
        const groupId = parseInt(gidStr, 10)

        // Rank statements by the strength of the in-group majority (agree or
        // disagree); keep only ones where either side is a clear majority
        const scores: Record<string, number> = {}
        Object.entries(g.votes).forEach(([tidStr, v]) => {
          if (v.S === 0) return
          const majorityRate = Math.max(v.A, v.D) / v.S
          if (majorityRate > 0.5) scores[tidStr] = majorityRate
        })

        const items: ConsensusStatement[] = []
        selectTopConsensusItems(scores).forEach((tidStr) => {
          const tid = parseInt(tidStr, 10)
          const comment = comments.find((c) => c.tid === tid)
          if (!comment) return

          const v = g.votes[tidStr]
          const agree = v.A
          const disagree = v.D
          const total = v.S
          const pass = Math.max(0, total - agree - disagree)
          items.push({
            tid,
            text: comment.txt,
            agree,
            disagree,
            pass,
            agreePct: Math.round((agree / total) * 100),
            disagreePct: Math.round((disagree / total) * 100),
            passPct: Math.round((pass / total) * 100)
          })
        })

        // Agree-majority cards first (by agree rate), then disagree-majority (by disagree rate)
        items.sort((a, b) => {
          const aDisagree = a.disagree > a.agree
          const bDisagree = b.disagree > b.agree
          if (aDisagree !== bDisagree) return aDisagree ? 1 : -1
          return aDisagree ? b.disagreePct - a.disagreePct : b.agreePct - a.agreePct
        })

        return { groupId, name: groupLetters[groupId] ?? String(groupId), items }
      })
      .filter((g) => g.items.length > 0)
      .sort((a, b) => a.groupId - b.groupId)
  }, [hasPca, pcaData, comments])

  // ── Selection handlers (group / consensus / statement are exclusive) ──
  const selectGroup = useCallback((groupId: number | null) => {
    setSelectedGroup((prev) => (prev === groupId ? null : groupId))
    setIsConsensusSelected(false)
    setSelectedStatement(null)
  }, [])

  const toggleConsensus = useCallback(() => {
    setIsConsensusSelected((prev) => {
      const next = !prev
      if (next) setSelectedGroup(null)
      return next
    })
    setSelectedStatement(null)
  }, [])

  const selectChip = useCallback(
    (chip: StatChip) => {
      const context: StatementContext = isConsensusSelected
        ? 'consensus'
        : { groupId: selectedGroup as number }
      setSelectedStatement((prev) =>
        prev && prev.tid === chip.tid
          ? null
          : { tid: chip.tid, pSuccess: 0, type: chip.type, context }
      )
    },
    [isConsensusSelected, selectedGroup]
  )

  // ── Voting ────────────────────────────────────────────────────
  const vote = useCallback(
    async (voteType: number) => {
      if (!statement) return
      hasVotedRef.current = true
      setIsFetchingNext(true)
      setVoteError(null)
      try {
        const result = await submitVoteAndGetNext(
          { vote: voteType, tid: statement.tid },
          conversation_id
        )
        if (result?.nextComment) {
          setStatement(result.nextComment)
          const next = result.nextComment as StatementData & { total?: number }
          if (typeof next.total === 'number') setTotal(next.total)
        } else {
          setStatement(undefined)
        }
      } catch (err: unknown) {
        console.error('v2: vote submission failed', err)
        setVoteError(resolveVoteError(err, s))
      } finally {
        setIsFetchingNext(false)
      }
    },
    [statement, conversation_id, s]
  )

  const notDone = !!statement
  const allDone = hasLoadedFirst && !statement

  // ── Progress ──────────────────────────────────────────────────
  // Once every statement is answered there is no current statement, so force a
  // completed state: the progress bar reads 100% and the counter reads 0.
  const remaining = allDone ? 0 : statement?.remaining
  const progressPct = useMemo(() => {
    if (allDone) return 100
    if (typeof total === 'number' && total > 0 && typeof remaining === 'number') {
      return Math.max(0, Math.min(100, Math.round(((total - remaining) / total) * 100)))
    }
    return null
  }, [allDone, total, remaining])

  return {
    // voting
    statement,
    remaining,
    total,
    progressPct,
    notDone,
    allDone,
    isRedirectingToVisualization,
    isFetchingNext,
    voteError,
    vote,
    // groups / map
    groupsEnabled,
    hasPca,
    pcaData,
    viz,
    groups,
    groupProfiles,
    chips,
    stat,
    consensusItems,
    groupConsensusItems,
    selectedGroup,
    isConsensusSelected,
    selectedStatement,
    selectGroup,
    toggleConsensus,
    selectChip
  }
}
