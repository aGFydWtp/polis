import type { Translations } from '../../strings/types'
import OpinionGroupsSection from './OpinionGroupsSection'
import { useVotingScreen } from './useVotingScreen'

const INK = '#1f2a44'

function ArrowLeftIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="20" y1="12" x2="4" y2="12" />
      <path d="m11 5-7 7 7 7" />
    </svg>
  )
}

interface VisualizationScreenProps {
  conversation_id: string
  s: Translations
  topic: string
  /** vis_type from the conversation; opinion groups only render when === 1 */
  visType?: number
  /** Mount point of this app (`/alpha` behind nginx, `''` at the root) */
  basePath?: string
}

/**
 * Standalone /:id/visualization page: only the data-display part of the
 * voting screen (opinion-group map and the group data cards), under a
 * minimal header with the conversation title and a back button.
 */
export default function VisualizationScreen({
  conversation_id,
  s,
  topic,
  visType,
  basePath = ''
}: VisualizationScreenProps) {
  const vm = useVotingScreen({ conversation_id, visType, s, votingEnabled: false })
  const backHref = `${basePath}/${conversation_id}`

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        background: '#eef1f6',
        minHeight: '100vh'
      }}
    >
      {/* Paints the iOS status-bar safe area dark (theme-color alone doesn't tint
          it when the address bar sits at the bottom). Zero height off-notch. */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 'env(safe-area-inset-top)',
          background: INK,
          zIndex: 100
        }}
      />
      {/* Header — full-width band; content constrained to the main column width */}
      <div style={{ background: INK, color: '#fff', padding: '14px 20px' }}>
        <div
          style={{
            maxWidth: 1000,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            gap: 14
          }}
        >
          <a
            href={backHref}
            aria-label={s.v2VisualizationBack}
            style={{
              flex: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: 12,
              color: '#fff',
              background: 'rgba(255,255,255,.12)',
              border: '1px solid rgba(255,255,255,.22)'
            }}
          >
            <ArrowLeftIcon />
          </a>
          <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.4, minWidth: 0 }}>
            {s.v2VisualizationTitle}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 18px 26px' }}>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            lineHeight: 1.4,
            color: INK,
            margin: '22px 0 0'
          }}
        >
          {topic}
        </h1>
        <OpinionGroupsSection s={s} vm={vm} />
      </div>
    </div>
  )
}
