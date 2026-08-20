import type { Translations } from '../../strings/types'
import type { StatementData } from '../types'
import VotingLayout from './VotingLayout'
import { useVotingScreen } from './useVotingScreen'

interface VotingScreenProps {
  conversation_id: string
  s: Translations
  topic: string
  description: string
  initialStatement?: StatementData
  /** vis_type from the conversation; opinion groups only render when === 1 */
  visType?: number
}

/**
 * Entry point for the voting screen v2 (?ui=v2). Owns the shared voting state
 * hook and renders the single-column layout, where the current statement is
 * voted on inline in the progress card.
 */
export default function VotingScreen({
  conversation_id,
  s,
  topic,
  description,
  initialStatement,
  visType
}: VotingScreenProps) {
  const vm = useVotingScreen({ conversation_id, initialStatement, visType, s })

  return <VotingLayout s={s} topic={topic} description={description} vm={vm} />
}
