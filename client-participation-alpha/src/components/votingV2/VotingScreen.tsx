import { useEffect, useRef, useState } from 'react'
import type { Translations } from '../../strings/types'
import type { StatementData } from '../types'
import DesktopDock from './DesktopDock'
import MobileBottomSheet from './MobileBottomSheet'
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

const MOBILE_QUERY = '(max-width: 899px)'

/**
 * Tracks whether the viewport is in the mobile range. Returns `null` until the
 * first client measurement so SSR and the initial hydration render agree (both
 * render the neutral placeholder), avoiding a hydration mismatch / layout flash.
 */
function useIsMobile(): boolean | null {
  const [isMobile, setIsMobile] = useState<boolean | null>(null)
  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY)
    const update = () => setIsMobile(mql.matches)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [])
  return isMobile
}

/**
 * Entry point for the voting screen v2 (?ui=v2). Owns the shared voting state
 * hook and renders the mobile bottom-sheet (3c) or desktop dock (4a) layout.
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
  const isMobile = useIsMobile()
  const desktopOpenedRef = useRef(false)

  // The desktop dock defaults to expanded (per the 4a design); the mobile sheet
  // stays collapsed (peek) until the participant taps "投票する".
  useEffect(() => {
    if (isMobile === false && !desktopOpenedRef.current) {
      desktopOpenedRef.current = true
      vm.openSheet()
    }
  }, [isMobile, vm])

  if (isMobile === null) {
    // Neutral placeholder to keep SSR and first client render identical.
    return <div style={{ minHeight: '100vh', background: '#eef1f6' }} />
  }

  return isMobile ? (
    <MobileBottomSheet s={s} topic={topic} description={description} vm={vm} />
  ) : (
    <DesktopDock s={s} topic={topic} vm={vm} />
  )
}
