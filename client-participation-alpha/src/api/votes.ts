import type { VoteResponse } from '../components/types'
import { uiLanguage } from '../lib/lang'
import PolisNet from '../lib/net'

export async function submitVote(payload: {
  agid: number
  conversation_id: string
  high_priority?: boolean
  lang?: string
  pid: number
  tid: number | string
  vote: number
}): Promise<VoteResponse> {
  // Auto-detect language only if not provided (undefined)
  // If lang is null or blank, don't auto-detect
  const lang = payload.lang !== undefined ? payload.lang : uiLanguage()
  const finalPayload = {
    ...payload,
    ...(lang && { lang })
  }
  return await PolisNet.polisPost<VoteResponse>('/votes', finalPayload)
}

export interface SelfVoteRow {
  tid: number
  /** Raw vote sign: agree = -1, disagree = 1, pass = 0 */
  vote: number
  pid: number
  [key: string]: unknown
}

/**
 * Fetch the current participant's own votes for a conversation.
 * The participant JWT (attached as a Bearer header by PolisNet) identifies
 * the pid server-side; without a token the server returns an empty list.
 */
export async function fetchMyVotes(conversationId: string): Promise<SelfVoteRow[]> {
  return await PolisNet.polisGet<SelfVoteRow[]>('/votes', { conversation_id: conversationId })
}
