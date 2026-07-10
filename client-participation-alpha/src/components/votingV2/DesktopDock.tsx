import type { CSSProperties } from 'react'
import type { Translations } from '../../strings/types'
import GroupControls, { StatCard } from './GroupControls'
import OpinionGroupMap from './OpinionGroupMap'
import { VOTE_AGREE, VOTE_DISAGREE, VOTE_HOLD, type useVotingScreen } from './useVotingScreen'

const INK = '#1f2a44'
const INDIGO = '#3b5bdb'
/** Desktop content band: title, groups and the floating vote card center within this. */
const STAGE_MAX = 1024
/** Right inset that pins the floating card to the centered band's right edge (0 once the
    viewport is narrower than the band). */
const CARD_RIGHT = `max(0px, calc((100% - ${STAGE_MAX}px) / 2))`
/** Collapsed card height — enough for the progress row + CTA button. */
const CLOSED_CARD_H = 132

/** Hover/focus tooltip for the opinion-group ⓘ icon (ported from the 5a mock). */
const GTIP_CSS = `
.v2gtip{position:relative;display:inline-flex}
.v2gtip>.v2gtipbox{position:absolute;top:calc(100% + 8px);left:-4px;width:264px;background:#1f2a44;color:#dbe2ef;font-size:12px;line-height:1.75;font-weight:400;text-align:left;padding:13px 15px;border-radius:11px;box-shadow:0 14px 34px -10px rgba(20,24,40,.55);opacity:0;visibility:hidden;transform:translateY(-4px);transition:opacity .16s ease,transform .16s ease,visibility .16s;z-index:60;pointer-events:none}
.v2gtip:hover>.v2gtipbox,.v2gtip:focus-within>.v2gtipbox{opacity:1;visibility:visible;transform:translateY(0)}
.v2gtipbox p{margin:0 0 9px}
.v2gtipbox p:last-child{margin:0}
`

type VM = ReturnType<typeof useVotingScreen>

interface DesktopDockProps {
  s: Translations
  topic: string
  description: string
  vm: VM
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
        style={{ ...voteBtnBase, ...voteBtnTint('217, 70, 59'), opacity: disabled ? 0.6 : 1 }}
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
        style={{ ...voteBtnBase, ...voteBtnTint('136, 146, 166'), opacity: disabled ? 0.6 : 1 }}
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

/** "残り {{n}} 問" with the count emphasized in indigo. */
function RemainingCount({ s, remaining }: { s: Translations; remaining: number | undefined }) {
  const [before, after] = s.v2RemainingCount.split('{{n}}')
  return (
    <span style={{ fontSize: 14, color: '#6b7488', whiteSpace: 'nowrap' }}>
      {before}
      <b style={{ color: INDIGO, fontSize: 14 }}>{remaining ?? '—'}</b>
      {after}
    </span>
  )
}

export default function DesktopDock({ s, topic, description, vm }: DesktopDockProps) {
  const showMap = vm.groupsEnabled && vm.hasPca

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#f4f6f9',
        overflow: 'hidden'
      }}
    >
      <style>{GTIP_CSS}</style>
      {/* header bar — full-bleed background, content constrained to the 900px band */}
      <div style={{ flex: 'none', background: INK, color: '#fff' }}>
        <div
          style={{
            maxWidth: STAGE_MAX,
            width: '100%',
            margin: '0 auto',
            // Tall enough that the collapsed vote card (bottom ≈ 148px) sits within
            // the header, so full-width content below never collides with it.
            minHeight: 135,
            padding: '18px 0 18px 32px',
            display: 'flex',
            alignItems: 'center',
            gap: 24
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 14,
                letterSpacing: '.08em',
                fontWeight: 700,
                color: '#8fa0c4',
                marginBottom: 4
              }}
            >
              {s.v2HeroTagline}
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.3 }}>{topic}</div>
            {description && (
              <div
                style={{
                  fontSize: 16,
                  lineHeight: 1.6,
                  color: '#c3ccdd',
                  marginTop: 6,
                  whiteSpace: 'pre-line'
                }}
              >
                {description}
              </div>
            )}
          </div>
          {/* reserve the right column so the floating vote panel (which bleeds
              up through the header) never overlaps the title/description. */}
          <div style={{ flex: 'none', width: 380 }} aria-hidden="true" />
        </div>
      </div>

      {/* main split — content constrained to the 900px band, centered */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', justifyContent: 'center' }}>
        {/* left: reference groups */}
        <div
          style={{
            width: '100%',
            maxWidth: STAGE_MAX,
            minWidth: 0,
            overflow: 'auto',
            padding: '28px 32px',
            // Reserve the card gutter only while it is open; reclaim full width when
            // collapsed. Transitions in step with the card's grow/shrink.
            paddingRight: vm.sheetOpen ? 404 : 32,
            transition: 'padding-right .32s cubic-bezier(.4, 0, .2, 1)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: INK }}>{s.opinionGroups}</div>
            <span
              className="v2gtip"
              tabIndex={0}
              role="button"
              aria-label={s.opinionGroups}
              style={{ outline: 'none' }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#8794ad"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ cursor: 'pointer', display: 'block' }}
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
              <span className="v2gtipbox">
                {s.v2GroupsTooltip.split('\n\n').map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </span>
            </span>
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
                      fontSize: 14,
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

        {/* right: floating vote panel (5a — breaks up through the header) */}
        <aside
          style={{
            position: 'absolute',
            top: 16,
            right: CARD_RIGHT,
            // Open → full viewport height; closed → just the progress + CTA row.
            // Animating between the two fixed heights gives the grow/shrink motion.
            height: vm.sheetOpen ? 'calc(100% - 40px)' : CLOSED_CARD_H,
            transition: 'height .32s cubic-bezier(.4, 0, .2, 1)',
            width: 380,
            background: '#fff',
            borderRadius: 16,
            overflow: 'hidden',
            border: '1px solid rgba(0,0,0,.06)',
            boxShadow: '0 18px 50px -20px rgba(20,24,40,.4), 0 6px 18px rgba(0,0,0,.1)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 5
          }}
        >
          {/* progress + primary CTA (always visible) */}
          <div style={{ flex: 'none', padding: '15px 17px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 9
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 700, color: INK }}>
                {s.v2VotingProgress}
              </span>
              <RemainingCount s={s} remaining={vm.remaining} />
            </div>
            <div
              style={{
                height: 7,
                borderRadius: 4,
                background: '#eef1f6',
                overflow: 'hidden',
                marginBottom: 13
              }}
            >
              <div
                style={{
                  height: '100%',
                  borderRadius: 4,
                  background: INDIGO,
                  width: vm.progressPct != null ? `${vm.progressPct}%` : '25%',
                  opacity: vm.progressPct != null ? 1 : 0.4,
                  transition: 'width .4s ease'
                }}
              />
            </div>
            {vm.sheetOpen ? (
              <button
                onClick={vm.closeSheet}
                style={{
                  width: '100%',
                  padding: 10,
                  border: '1.5px solid #e3e6ec',
                  borderRadius: 11,
                  background: '#fff',
                  color: '#6b7488',
                  fontFamily: 'inherit',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {s.v2VoteClose}
              </button>
            ) : (
              <button
                onClick={vm.openSheet}
                style={{
                  width: '100%',
                  padding: 13,
                  border: 'none',
                  borderRadius: 12,
                  background: INDIGO,
                  color: '#fff',
                  fontFamily: 'inherit',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
                {s.v2VoteCta}
              </button>
            )}
          </div>

          {/* vote card body — shown when the panel is open */}
          {vm.sheetOpen && (
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                borderTop: '1px solid #eef1f6',
                padding: '16px 17px'
              }}
            >
              {vm.notDone && vm.statement ? (
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: INK, lineHeight: 1.6 }}>
                    {s.v2VotePrompt}
                  </div>
                  <div
                    style={{
                      marginTop: 12,
                      border: '1.5px solid #d5def7',
                      background: '#f7f9fe',
                      borderRadius: 14,
                      padding: '14px 15px'
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
                  <VoteButtons s={s} vm={vm} />
                </div>
              ) : (
                <div
                  style={{
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
                  <div style={{ fontSize: 14, lineHeight: 1.75, color: '#5a7a68' }}>
                    {s.v2AllAnsweredBody}
                  </div>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
