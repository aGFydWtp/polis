import { useEffect, useState, type CSSProperties } from 'react'
import type { Translations } from '../../strings/types'
import ConsensusSection from './ConsensusSection'
import GroupControls, { StatCard } from './GroupControls'
import GroupProfileCards from './GroupProfileCards'
import GroupsInfoTip from './GroupsInfoTip'
import OpinionGroupMap from './OpinionGroupMap'
import { VOTE_AGREE, VOTE_DISAGREE, VOTE_HOLD, type useVotingScreen } from './useVotingScreen'

const INK = '#1f2a44'
const INDIGO = '#3b5bdb'

const DESKTOP_QUERY = '(min-width: 900px)'

/**
 * Tracks whether the viewport is desktop-width. Starts false so SSR and the
 * first client render agree (mobile layout), then updates after measurement.
 */
function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_QUERY)
    const update = () => setIsDesktop(mql.matches)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [])
  return isDesktop
}

type VM = ReturnType<typeof useVotingScreen>

interface VotingLayoutProps {
  s: Translations
  topic: string
  description: string
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
      <div style={{ fontSize: 18, lineHeight: 1.8, color: '#25304a', fontWeight: 500 }}>
        {vm.statement.txt}
      </div>
      <VoteButtons s={s} vm={vm} />
    </div>
  )
}

function DoneBlock({ s }: { s: Translations }) {
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
      <div style={{ fontSize: 30, lineHeight: 1 }}>🎉</div>
      <div style={{ fontSize: 14.5, fontWeight: 700, color: '#1f7a4d', marginTop: 8 }}>
        {s.v2AllAnsweredTitle}
      </div>
      <div style={{ fontSize: 14, lineHeight: 1.7, color: '#5a7a68', marginTop: 5 }}>
        {s.v2AllAnsweredBody}
      </div>
    </div>
  )
}

export default function VotingLayout({ s, topic, description, vm }: VotingLayoutProps) {
  const showMap = vm.groupsEnabled && vm.hasPca
  const isDesktop = useIsDesktop()

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

          {vm.notDone ? <VoteBlock s={s} vm={vm} /> : vm.allDone ? <DoneBlock s={s} /> : null}
        </div>

        {/* Opinion groups */}
        <div style={{ marginTop: 20, marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: INK }}>{s.opinionGroups}</div>
            <GroupsInfoTip s={s} />
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.6, color: '#8794ad', marginTop: 3 }}>
            {s.v2OpinionGroupsDesc}
          </div>
        </div>
        <div
          style={{
            background: '#fff',
            borderRadius: 18,
            padding: 14,
            boxShadow: '0 4px 16px rgba(31,42,68,.06)',
            border: '1px solid #e7ebf2'
          }}
        >
          {/* Map and controls sit side by side at desktop widths (like the old
              desktop band), stacked on mobile. */}
          <div
            style={{
              display: 'flex',
              flexDirection: isDesktop ? 'row' : 'column',
              gap: isDesktop ? 24 : 0,
              alignItems: isDesktop ? 'flex-start' : 'stretch'
            }}
          >
            <div
              style={{
                flex: isDesktop ? 1 : 'none',
                minWidth: 0,
                borderRadius: 12,
                background: '#fafbfd',
                padding: '8px 4px'
              }}
            >
              {showMap ? (
                <OpinionGroupMap
                  hulls={vm.viz.hulls}
                  originX={vm.viz.originX}
                  originY={vm.viz.originY}
                  userPosition={vm.viz.userPosition}
                  groupVoteData={vm.viz.groupVoteData}
                  selectedGroup={vm.selectedGroup}
                  statementSelected={!!vm.selectedStatement}
                  onSelectGroup={vm.selectGroup}
                  youLabel={s.v2YouBubble}
                />
              ) : (
                <div
                  style={{
                    padding: '48px 16px',
                    textAlign: 'center',
                    fontSize: 14,
                    color: '#8794ad'
                  }}
                >
                  {s.v2GroupsNotFormed}
                </div>
              )}
            </div>

            {showMap && (
              <div style={{ flex: 'none', width: isDesktop ? 300 : 'auto' }}>
                <div style={{ marginTop: isDesktop ? 0 : 12 }}>
                  <GroupControls
                    s={s}
                    groups={vm.groups}
                    chips={vm.chips}
                    selectedGroup={vm.selectedGroup}
                    isConsensusSelected={vm.isConsensusSelected}
                    selectedStatement={vm.selectedStatement}
                    onMajor={vm.toggleConsensus}
                    onSelectGroup={vm.selectGroup}
                    onSelectChip={vm.selectChip}
                    divider={isDesktop}
                  />
                </div>
                {vm.stat && <StatCard s={s} stat={vm.stat} variant="mobile" />}
              </div>
            )}
          </div>
        </div>

        {/* Per-opinion-group representative-comment cards; two-up at desktop widths */}
        <GroupProfileCards s={s} profiles={vm.groupProfiles} columns={isDesktop ? 2 : 1} />

        {/* みんなの共通意見 — cross-group consensus donut cards (6d);
            two-up at desktop widths */}
        <ConsensusSection
          s={s}
          items={vm.consensusItems}
          variant={isDesktop ? 'desktop' : 'mobile'}
          columns={isDesktop ? 2 : 1}
        />

        {/* グループ◯で同意されている意見 — per-group agreed opinions, same
            donut-card layout as the consensus section, ordered A, B, C… */}
        {vm.groupConsensusItems.map((group) => (
          <ConsensusSection
            key={`group-consensus-${group.groupId}`}
            s={s}
            items={group.items}
            variant={isDesktop ? 'desktop' : 'mobile'}
            columns={isDesktop ? 2 : 1}
            title={s.v2GroupAgreedTitle.replace('{{name}}', group.name)}
            subtitle={s.v2GroupAgreedSubtitle.replace('{{name}}', group.name)}
            highlightDominant
          />
        ))}
      </div>
    </div>
  )
}
