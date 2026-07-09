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

interface DesktopDockProps {
  s: Translations
  topic: string
  vm: VM
}

const voteBtnBase: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 9,
  width: '100%',
  padding: '13px',
  border: 'none',
  borderRadius: 12,
  fontFamily: 'inherit',
  fontSize: 15,
  fontWeight: 700,
  cursor: 'pointer'
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
        style={{
          ...voteBtnBase,
          background: '#2f9e6f',
          color: '#fff',
          opacity: disabled ? 0.6 : 1
        }}
        disabled={disabled}
        onClick={() => vm.vote(VOTE_AGREE)}
      >
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
        {s.agree}
      </button>
      <button
        style={{
          ...voteBtnBase,
          background: '#e6483c',
          color: '#fff',
          opacity: disabled ? 0.6 : 1
        }}
        disabled={disabled}
        onClick={() => vm.vote(VOTE_DISAGREE)}
      >
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
        {s.disagree}
      </button>
      <button
        style={{ ...voteBtnBase, background: '#f5bd4f', color: INK, opacity: disabled ? 0.6 : 1 }}
        disabled={disabled}
        onClick={() => vm.vote(VOTE_HOLD)}
      >
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
        {s.v2Hold}
      </button>
    </div>
  )
}

const cardStyle: CSSProperties = {
  background: '#fff',
  borderRadius: 16,
  padding: 16,
  boxShadow: '0 4px 16px rgba(31,42,68,.06)',
  border: '1px solid #e7ebf2'
}

export default function DesktopDock({ s, topic, vm }: DesktopDockProps) {
  const showMap = vm.groupsEnabled && vm.hasPca

  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#f4f6f9',
        overflow: 'hidden'
      }}
    >
      {/* header bar */}
      <div
        style={{
          flex: 'none',
          background: INK,
          color: '#fff',
          padding: '18px 28px',
          display: 'flex',
          alignItems: 'center',
          gap: 24
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: '.08em',
              fontWeight: 700,
              color: '#8fa0c4',
              marginBottom: 4
            }}
          >
            {s.v2HeroTagline}
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.3 }}>{topic}</div>
        </div>
        <div style={{ flex: 'none', width: 280 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 7
            }}
          >
            <span style={{ fontSize: 11.5, color: '#c3ccdd' }}>{s.v2VotingProgress}</span>
            <span style={{ fontSize: 12, color: '#c3ccdd' }}>
              {(() => {
                const [before, after] = s.v2RemainingCount.split('{{n}}')
                return (
                  <>
                    {before}
                    <b style={{ color: '#fff', fontSize: 14 }}>{vm.remaining ?? '—'}</b>
                    {after}
                  </>
                )
              })()}
            </span>
          </div>
          <div
            style={{
              height: 7,
              borderRadius: 4,
              background: 'rgba(255,255,255,.16)',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                height: '100%',
                borderRadius: 4,
                background: '#fff',
                width: vm.progressPct != null ? `${vm.progressPct}%` : '25%',
                opacity: vm.progressPct != null ? 1 : 0.4,
                transition: 'width .4s ease'
              }}
            />
          </div>
        </div>
      </div>

      {/* main split */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        {/* left: groups */}
        <div style={{ flex: 1, minWidth: 0, overflow: 'auto', padding: '28px 32px' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: INK }}>{s.opinionGroups}</div>
          <div
            style={{
              fontSize: 12.5,
              lineHeight: 1.6,
              color: '#8794ad',
              marginTop: 4,
              maxWidth: 560
            }}
          >
            {s.v2OpinionGroupsDesc} {s.v2VoteInDockHint}
          </div>

          <div style={{ display: 'flex', gap: 24, marginTop: 20, alignItems: 'flex-start' }}>
            <div style={{ ...cardStyle, flex: 1, minWidth: 0 }}>
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
                      padding: '64px 16px',
                      textAlign: 'center',
                      fontSize: 13,
                      color: '#8794ad'
                    }}
                  >
                    {s.v2GroupsNotFormed}
                  </div>
                )}
              </div>
            </div>

            {showMap && (
              <div
                style={{
                  flex: 'none',
                  width: 300,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14
                }}
              >
                <div style={cardStyle}>
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
                    divider
                  />
                </div>
                {vm.stat && (
                  <div style={cardStyle}>
                    <StatCard s={s} stat={vm.stat} variant="desktop" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* right: voting dock */}
        {vm.sheetOpen ? (
          <div
            style={{
              flex: 'none',
              width: 360,
              background: '#fff',
              borderLeft: '1px solid #e7ebf2'
            }}
          >
            <div
              style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                padding: '20px 22px'
              }}
            >
              <div
                style={{
                  flex: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  marginBottom: 16
                }}
              >
                {vm.allDone ? (
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 15,
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
                ) : (
                  <span style={{ fontSize: 15, fontWeight: 700, color: INK }}>
                    {s.v2RemainingCount.replace('{{n}}', String(vm.remaining ?? '—'))}
                  </span>
                )}
                <button
                  onClick={vm.closeSheet}
                  title={s.v2Close}
                  style={{
                    marginLeft: 'auto',
                    flex: 'none',
                    width: 32,
                    height: 32,
                    border: 'none',
                    borderRadius: 9,
                    background: '#f1f3f8',
                    color: '#5a6272',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m9 6 6 6-6 6" />
                  </svg>
                </button>
              </div>

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
                  <div
                    style={{ flex: 1, minHeight: 60, position: 'relative', margin: '0 -2px 2px' }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        overflow: 'auto',
                        padding: '0 2px 20px'
                      }}
                    >
                      <div
                        style={{
                          fontSize: 16,
                          lineHeight: 1.85,
                          color: '#25304a',
                          fontWeight: 500
                        }}
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
              )}
            </div>
          </div>
        ) : (
          <div
            role="button"
            tabIndex={0}
            aria-label={s.v2VoteCta}
            onClick={vm.openSheet}
            onKeyDown={activateOnKey(vm.openSheet)}
            title={s.v2VoteCta}
            style={{
              flex: 'none',
              width: 56,
              background: '#fff',
              borderLeft: '1px solid #e7ebf2',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '18px 0',
              gap: 16
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: INDIGO,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 'none'
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.3"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </div>
            <div
              style={{
                writingMode: 'vertical-rl',
                fontSize: 14,
                fontWeight: 700,
                color: INK,
                letterSpacing: '.05em'
              }}
            >
              {s.v2VoteCta}
            </div>
            <div
              style={{
                writingMode: 'vertical-rl',
                fontSize: 11,
                fontWeight: 700,
                color: '#fff',
                background: INDIGO,
                padding: '9px 5px',
                borderRadius: 8
              }}
            >
              {s.v2RemainingCount.replace('{{n}}', String(vm.remaining ?? '—'))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
