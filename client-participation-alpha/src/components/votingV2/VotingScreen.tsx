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
  /** vis_type from the conversation; the visualization link only shows when === 1 */
  visType?: number
  /** Mount point of this app (`/alpha` behind nginx, `''` at the root) */
  basePath?: string
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
  visType,
  basePath = ''
}: VotingScreenProps) {
  const vm = useVotingScreen({ conversation_id, initialStatement, s })

  return (
    <VotingLayout
      s={s}
      conversation_id={conversation_id}
      basePath={basePath}
      topic={topic}
      description={description}
      visualizationEnabled={visType === 1}
      vm={vm}
    />
  )
}
