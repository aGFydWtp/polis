import type { CSSProperties, KeyboardEvent } from 'react'
import type { Translations } from '../../strings/types'
import GroupControls, { StatCard } from './GroupControls'
import OpinionGroupMap from './OpinionGroupMap'
import { VOTE_AGREE, VOTE_DISAGREE, VOTE_HOLD, type useVotingScreen } from './useVotingScreen'

const INK = '#1f2a44'
const INDIGO = '#3b5bdb'

type VM = ReturnType<typeof useVotingScreen>

/** Activates a click handler on Enter/Space for keyboard accessibility. */
const activateOnKey = (fn: () => void) => (e: KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    fn()
  }
}

interface MobileBottomSheetProps {
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
    <span style={{ fontSize: 12, color: '#6b7488' }}>
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
            fontSize: 12.5,
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
        {s.v2Hold}
      </button>
    </div>
  )
}

function DoneBlock({ s }: { s: Translations }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 9,
        padding: 16
      }}
    >
      <div style={{ fontSize: 38, lineHeight: 1 }}>🎉</div>
      <div style={{ fontSize: 16.5, fontWeight: 700, color: '#1f7a4d' }}>
        {s.v2AllAnsweredTitle}
      </div>
      <div style={{ fontSize: 12.5, lineHeight: 1.75, color: '#5a7a68' }}>
        {s.v2AllAnsweredBody}
      </div>
    </div>
  )
}

export default function MobileBottomSheet({ s, topic, description, vm }: MobileBottomSheetProps) {
  const showMap = vm.groupsEnabled && vm.hasPca

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        background: '#eef1f6',
        minHeight: '100vh',
        paddingBottom: 80
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
      {/* Hero */}
      <div style={{ background: INK, color: '#fff', padding: '16px 20px 22px' }}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: '.08em',
            fontWeight: 700,
            color: '#8fa0c4',
            marginBottom: 6
          }}
        >
          {s.v2HeroTagline}
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.35 }}>{topic}</div>
        {description && (
          <div style={{ fontSize: 12.5, lineHeight: 1.7, color: '#c3ccdd', marginTop: 8 }}>
            {description}
          </div>
        )}
      </div>

      <div style={{ padding: '0 18px 26px', marginTop: -10 }}>
        {/* Progress + CTA */}
        <div
          style={{
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
            <span style={{ fontSize: 12, fontWeight: 700, color: INK }}>{s.v2VotingProgress}</span>
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
            <>
              <button
                onClick={vm.openSheet}
                style={{
                  width: '100%',
                  padding: 15,
                  border: 'none',
                  borderRadius: 14,
                  background: INDIGO,
                  color: '#fff',
                  fontFamily: 'inherit',
                  fontSize: 15.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 9,
                  boxShadow: '0 10px 22px -10px rgba(59,91,219,.7)'
                }}
              >
                {s.v2VoteCta}
              </button>
              <div style={{ textAlign: 'center', fontSize: 11, color: '#9aa2b1', marginTop: 9 }}>
                {s.v2CtaHint}
              </div>
            </>
          ) : vm.allDone ? (
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
              <div style={{ fontSize: 12, lineHeight: 1.7, color: '#5a7a68', marginTop: 5 }}>
                {s.v2AllAnsweredBody}
              </div>
            </div>
          ) : null}
        </div>

        {/* Opinion groups */}
        <div style={{ marginTop: 20, marginBottom: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: INK }}>{s.opinionGroups}</div>
          <div style={{ fontSize: 11.5, lineHeight: 1.6, color: '#8794ad', marginTop: 3 }}>
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
          <div style={{ borderRadius: 12, background: '#fafbfd', padding: '8px 4px' }}>
            {showMap ? (
              <OpinionGroupMap
                hulls={vm.viz.hulls}
                originX={vm.viz.originX}
                originY={vm.viz.originY}
                userPosition={vm.viz.userPosition}
                groupVoteData={vm.viz.groupVoteData}
                selectedGroup={vm.selectedGroup}
                statementSelected={!!vm.selectedStatement}
              />
            ) : (
              <div
                style={{
                  padding: '48px 16px',
                  textAlign: 'center',
                  fontSize: 12.5,
                  color: '#8794ad'
                }}
              >
                {s.v2GroupsNotFormed}
              </div>
            )}
          </div>

          {showMap && (
            <>
              <div style={{ marginTop: 12 }}>
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
                />
              </div>
              {vm.stat && <StatCard s={s} stat={vm.stat} variant="mobile" />}
            </>
          )}
        </div>
      </div>

      {/* Dim overlay when open */}
      {vm.sheetOpen && (
        <div
          role="button"
          tabIndex={0}
          aria-label={s.v2Close}
          onClick={vm.closeSheet}
          onKeyDown={activateOnKey(vm.closeSheet)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,20,35,.32)',
            zIndex: 15,
            animation: 'fade .3s ease'
          }}
        />
      )}

      {/* Bottom sheet */}
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 20,
          background: '#fff',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          boxShadow: '0 -8px 30px rgba(20,24,40,.18)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '80vh'
        }}
      >
        {/* handle / tab header (tap to toggle) */}
        <div
          role="button"
          tabIndex={0}
          aria-label={vm.sheetOpen ? s.v2Close : s.v2Pull}
          onClick={vm.toggleSheet}
          onKeyDown={activateOnKey(vm.toggleSheet)}
          style={{
            flex: 'none',
            cursor: 'pointer',
            padding: '10px 18px 12px',
            borderBottom: '1px solid #eef1f6'
          }}
        >
          <div
            style={{
              width: 40,
              height: 5,
              borderRadius: 3,
              background: '#d6dbe4',
              margin: '0 auto 10px'
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            {vm.allDone ? (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#1f7a4d'
                }}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                {s.v2AllAnsweredShort}
              </span>
            ) : vm.sheetOpen ? (
              <span style={{ fontSize: 14, fontWeight: 700, color: INK }}>
                {s.v2RemainingCount.replace('{{n}}', String(vm.remaining ?? '—'))}
              </span>
            ) : (
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  fontSize: 14,
                  fontWeight: 700,
                  color: INK
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: INDIGO,
                    flex: 'none'
                  }}
                />
                {s.v2VotingInProgress.replace('{{n}}', String(vm.remaining ?? '—'))}
              </span>
            )}
            <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: vm.sheetOpen ? '#9aa2b1' : INDIGO
                }}
              >
                {vm.sheetOpen ? s.v2Close : s.v2Pull}
              </span>
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 9,
                  background: '#f1f3f8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#5a6272'
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    transform: vm.sheetOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform .3s ease'
                  }}
                  aria-hidden="true"
                >
                  <path d="m6 15 6-6 6 6" />
                </svg>
              </span>
            </span>
          </div>
        </div>

        {/* sheet body (only when open) */}
        {vm.sheetOpen && (
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflow: 'hidden',
              padding: '16px 18px 18px',
              display: 'flex',
              flexDirection: 'column',
              animation: 'slideup .28s ease'
            }}
          >
            {vm.notDone && vm.statement ? (
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <div
                  style={{
                    flex: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 12
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 9,
                      background: '#eaeef7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#8794ad'
                    }}
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5Z" />
                    </svg>
                  </div>
                  <div style={{ fontSize: 12, color: '#8794ad' }}>{s.v2AnonOpinion}</div>
                </div>
                <div style={{ flex: 1, minHeight: 44, position: 'relative', margin: '0 -2px 2px' }}>
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      overflow: 'auto',
                      padding: '0 2px 20px'
                    }}
                  >
                    <div
                      style={{ fontSize: 16, lineHeight: 1.8, color: '#25304a', fontWeight: 500 }}
                    >
                      {vm.statement.txt}
                    </div>
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      bottom: 0,
                      height: 28,
                      background: 'linear-gradient(to top,#fff 20%,rgba(255,255,255,0))',
                      pointerEvents: 'none'
                    }}
                  />
                </div>
                <VoteButtons s={s} vm={vm} />
              </div>
            ) : (
              <DoneBlock s={s} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
