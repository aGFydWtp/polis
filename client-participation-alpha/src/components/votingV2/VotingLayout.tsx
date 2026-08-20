import type { CSSProperties } from 'react'
import type { Translations } from '../../strings/types'
import { VOTE_AGREE, VOTE_DISAGREE, VOTE_HOLD, type useVotingScreen } from './useVotingScreen'

const INK = '#1f2a44'
const INDIGO = '#3b5bdb'

type VM = ReturnType<typeof useVotingScreen>

interface VotingLayoutProps {
  s: Translations
  conversation_id: string
  topic: string
  description: string
  /** vis_type === 1 — gates the "see everyone's opinions" link in the done card */
  visualizationEnabled: boolean
  vm: VM
}

/** Renders "残り {{n}} 問" with the number emphasised in indigo. */
function RemainingCount({ template, n }: { template: string; n: number | undefined }) {
  const value = typeof n === 'number' ? n : '—'
  const [before, after] = template.split('{{n}}')
  return (
    <span style={{ fontSize: 14, color: '#6b7488' }}>
      {before}
      <b style={{ color: INDIGO, fontSize: 14 }}>{value}</b>
      {after}
    </span>
  )
}

const voteBtnBase: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  width: '100%',
  padding: '14px',
  border: 'none',
  borderRadius: 14,
  fontFamily: 'inherit',
  fontSize: 15.5,
  fontWeight: 700,
  boxShadow: '0 1px 2px 0 rgba(0,0,0,.04)',
  cursor: 'pointer'
}

/** Soft tinted vote-button style: 10% fill, full-strength label, 55% border. */
const voteBtnTint = (rgb: string): CSSProperties => ({
  background: `rgba(${rgb}, .1)`,
  color: `rgb(${rgb})`,
  border: `1.5px solid rgba(${rgb}, .55)`
})

function AgreeIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}
function DisagreeIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <line x1="6.4" y1="6.4" x2="17.6" y2="17.6" />
    </svg>
  )
}
function HoldIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M9.2 9.3a2.9 2.9 0 0 1 5.6 1c0 1.9-2.8 2.4-2.8 2.4" />
      <line x1="12" y1="17" x2="12.02" y2="17" />
    </svg>
  )
}

function VoteButtons({ s, vm }: { s: Translations; vm: VM }) {
  const disabled = vm.isFetchingNext
  return (
    <div style={{ flex: 'none', display: 'flex', flexDirection: 'column', gap: 9, marginTop: 14 }}>
      {vm.voteError && (
        <div
          role="alert"
          style={{
            padding: '9px 12px',
            borderRadius: 10,
            background: '#fdecea',
            border: '1px solid #f5c6c2',
            color: '#b3261e',
            fontSize: 14,
            lineHeight: 1.5
          }}
        >
          {vm.voteError}
        </div>
      )}
      <button
        style={{ ...voteBtnBase, ...voteBtnTint('47, 158, 111'), opacity: disabled ? 0.6 : 1 }}
        disabled={disabled}
        onClick={() => vm.vote(VOTE_AGREE)}
      >
        <AgreeIcon />
        {s.agree}
      </button>
      <button
        style={{ ...voteBtnBase, ...voteBtnTint('217, 70, 59'), opacity: disabled ? 0.6 : 1 }}
        disabled={disabled}
        onClick={() => vm.vote(VOTE_DISAGREE)}
      >
        <DisagreeIcon />
        {s.disagree}
      </button>
      <button
        style={{ ...voteBtnBase, ...voteBtnTint('136, 146, 166'), opacity: disabled ? 0.6 : 1 }}
        disabled={disabled}
        onClick={() => vm.vote(VOTE_HOLD)}
      >
        <HoldIcon />
        {s.pass}
      </button>
    </div>
  )
}

/** The statement being voted on, inline inside the progress card. */
function VoteBlock({ s, vm }: { s: Translations; vm: VM }) {
  if (!vm.statement) return null
  return (
    <div style={{ borderTop: '1px solid #eef1f6', paddingTop: 14 }}>
      <div
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: INK,
          lineHeight: 1.6,
          marginBottom: 10
        }}
      >
        {s.v2VotePrompt}
      </div>
      <div style={{ fontSize: 20, lineHeight: 1.8, color: '#25304a', fontWeight: 500 }}>
        {vm.statement.txt}
      </div>
      <VoteButtons s={s} vm={vm} />
    </div>
  )
}

/** Hover-darkening for the all-answered CTA (inline styles can't express :hover). */
const DONE_CTA_CSS =
  '.v2done-cta{text-decoration:none;transition:background .15s ease}' +
  '.v2done-cta:hover,.v2done-cta:focus-visible{background:#1a6741}'

/** Underlined text link under the vote card; darkens on hover like the CTA. */
const VIZ_LINK_CSS =
  '.v2viz-link{text-decoration:underline;transition:color .15s ease}' +
  '.v2viz-link:hover,.v2viz-link:focus-visible{color:#000}'

function VisualizationLink({ s, conversation_id }: { s: Translations; conversation_id: string }) {
  return (
    <div style={{ maxWidth: 600, margin: '10px auto 0', textAlign: 'right' }}>
      <style>{VIZ_LINK_CSS}</style>
      <a
        className="v2viz-link"
        href={`/${conversation_id}/visualization`}
        style={{ fontSize: 16, color: INK }}
      >
        {s.v2ViewEveryonesOpinions}
        {' \u2192'}
      </a>
    </div>
  )
}

function ArrowRightIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="4" y1="12" x2="20" y2="12" />
      <path d="m13 5 7 7-7 7" />
    </svg>
  )
}

function DoneBlock({
  s,
  conversation_id,
  visualizationEnabled
}: {
  s: Translations
  conversation_id: string
  visualizationEnabled: boolean
}) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 14,
        background: '#eef8f2',
        border: '1px solid #cfe9db',
        textAlign: 'center'
      }}
    >
      <div style={{ fontSize: 14.5, fontWeight: 700, color: '#1f7a4d' }}>
        {s.v2AllAnsweredTitle}
      </div>
      <div style={{ fontSize: 14, lineHeight: 1.7, color: '#5a7a68', marginTop: 5 }}>
        {s.v2AllAnsweredBody}
      </div>
      {visualizationEnabled && (
        <>
          <style>{DONE_CTA_CSS}</style>
          <a
            className="v2done-cta"
            href={`/${conversation_id}/visualization`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              marginTop: 14,
              padding: '13px 16px',
              borderRadius: 14,
              background: '#1f7a4d',
              color: '#fff',
              fontSize: 15,
              fontWeight: 700,
              boxShadow: '0 1px 2px 0 rgba(0,0,0,.04)'
            }}
          >
            {s.v2ViewEveryonesOpinions}
            <ArrowRightIcon />
          </a>
        </>
      )}
    </div>
  )
}

export default function VotingLayout({
  s,
  conversation_id,
  topic,
  description,
  visualizationEnabled,
  vm
}: VotingLayoutProps) {
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
      {/* Hero — full-width band; content constrained to the main column width */}
      <div style={{ background: INK, color: '#fff', padding: '16px 20px 22px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div
            style={{
              fontSize: 14,
              letterSpacing: '.08em',
              fontWeight: 700,
              color: '#8fa0c4',
              marginBottom: 6
            }}
          >
            {s.v2HeroTagline}
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.35 }}>{topic}</div>
          {description && (
            <div
              style={{
                fontSize: 16,
                lineHeight: 1.7,
                color: '#c3ccdd',
                marginTop: 8,
                whiteSpace: 'pre-line'
              }}
            >
              {description}
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: '-10px auto 0', padding: '0 18px 26px' }}>
        {/* Progress + the current statement, voted on in place */}
        <div
          style={{
            maxWidth: 600,
            margin: '0 auto',
            background: '#fff',
            borderRadius: 18,
            padding: 16,
            boxShadow: '0 4px 16px rgba(31,42,68,.07)',
            border: '1px solid #e7ebf2'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 9
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 700, color: INK }}>{s.v2VotingProgress}</span>
            <RemainingCount template={s.v2RemainingCount} n={vm.remaining} />
          </div>
          <div
            style={{
              height: 7,
              borderRadius: 4,
              background: '#eef1f6',
              overflow: 'hidden',
              marginBottom: 15
            }}
          >
            <div
              style={{
                height: '100%',
                borderRadius: 4,
                background: INDIGO,
                width: vm.progressPct != null ? `${vm.progressPct}%` : '25%',
                opacity: vm.progressPct != null ? 1 : 0.35,
                transition: 'width .4s ease'
              }}
            />
          </div>

          {vm.notDone ? (
            <VoteBlock s={s} vm={vm} />
          ) : vm.allDone ? (
            <DoneBlock
              s={s}
              conversation_id={conversation_id}
              visualizationEnabled={visualizationEnabled}
            />
          ) : null}
        </div>

        {/* Offered alongside voting; once everything is answered the done card's
            button takes over. */}
        {visualizationEnabled && vm.notDone && (
          <VisualizationLink s={s} conversation_id={conversation_id} />
        )}
      </div>
    </div>
  )
}
