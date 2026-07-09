import type { CSSProperties } from 'react'
import type { Translations } from '../../strings/types'
import type { SelectedStatement } from '../visualization/types'
import type { GroupInfo, StatChip, StatSummary } from './useVotingScreen'

const INDIGO = '#3b5bdb'

function tpl(str: string, vars: Record<string, string | number>): string {
  return str.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => String(vars[k] ?? ''))
}

// ── Button style helpers (computed like the design mock) ────────
const majorStyle = (active: boolean): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  width: '100%',
  padding: '10px 12px',
  border: 'none',
  borderRadius: 10,
  fontFamily: 'inherit',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  background: active ? INDIGO : '#f1f3f8',
  color: active ? '#fff' : '#5a6272'
})

const groupStyle = (active: boolean): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  padding: '6px 11px',
  border: 'none',
  borderRadius: 9,
  fontFamily: 'inherit',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  background: active ? INDIGO : '#eaeef7',
  color: active ? '#fff' : '#3a4257'
})

const chipStyle = (active: boolean): CSSProperties => ({
  minWidth: 30,
  padding: '6px 9px',
  border: 'none',
  borderRadius: 8,
  fontFamily: 'inherit',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  background: active ? INDIGO : '#eaeef7',
  color: active ? '#fff' : '#5a6272'
})

function BarChartIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="3" y="10" width="4" height="10" rx="1" />
      <rect x="10" y="4" width="4" height="16" rx="1" />
      <rect x="17" y="13" width="4" height="7" rx="1" />
    </svg>
  )
}

interface GroupControlsProps {
  s: Translations
  groups: GroupInfo[]
  chips: StatChip[]
  selectedGroup: number | null
  isConsensusSelected: boolean
  selectedStatement: SelectedStatement | null
  onMajor: () => void
  onSelectGroup: (id: number) => void
  onSelectChip: (chip: StatChip) => void
  /** Show a 1px divider between the group row and the chips (desktop 4a). */
  divider?: boolean
}

/**
 * Mock-style opinion-group controls: "major" (consensus) toggle, group buttons,
 * and the statement chips. These drive the selection state that the OpinionGroupMap
 * reflects. Shared by the mobile bottom-sheet (3c) and desktop dock (4a) layouts.
 */
export default function GroupControls({
  s,
  groups,
  chips,
  selectedGroup,
  isConsensusSelected,
  selectedStatement,
  onMajor,
  onSelectGroup,
  onSelectChip,
  divider = false
}: GroupControlsProps) {
  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button style={majorStyle(isConsensusSelected)} onClick={onMajor}>
          <BarChartIcon />
          {s.v2MajorOpinion}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#8794ad', flex: 'none' }}>
            {s.v2GroupLabel}
          </span>
          {groups.map((g) => (
            <button
              key={g.groupId}
              style={groupStyle(selectedGroup === g.groupId)}
              onClick={() => onSelectGroup(g.groupId)}
            >
              {g.name}{' '}
              <span style={{ fontSize: 14, opacity: 0.7 }}>
                {tpl(s.v2PeopleCount, { n: g.count })}
              </span>
            </button>
          ))}
        </div>
      </div>

      {divider && <div style={{ height: 1, background: '#eef1f6', margin: '14px 0' }} />}

      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: '#8794ad',
          margin: divider ? '0 0 9px' : '15px 0 8px'
        }}
      >
        {s.v2SelectToReact}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {chips.length === 0 ? (
          <span style={{ fontSize: 14, color: '#9aa2b1' }}>—</span>
        ) : (
          chips.map((chip) => (
            <button
              key={chip.tid}
              style={chipStyle(selectedStatement?.tid === chip.tid)}
              onClick={() => onSelectChip(chip)}
            >
              {chip.label}
            </button>
          ))
        )}
      </div>
    </div>
  )
}

interface StatCardProps {
  s: Translations
  stat: StatSummary
  variant: 'mobile' | 'desktop'
}

/**
 * Reaction summary card for the currently selected statement.
 * Green (#2f9e6f) for an agree stance, red (#e6483c) for disagree.
 */
export function StatCard({ s, stat, variant }: StatCardProps) {
  const color = stat.stance === 'agree' ? '#2f9e6f' : '#e6483c'
  const icon = stat.stance === 'agree' ? '✓' : '✕'
  const stanceLabel = stat.stance === 'agree' ? s.agree : s.disagree
  const reaction =
    variant === 'mobile'
      ? tpl(s.v2StatReaction, { pct: stat.pct, stance: stanceLabel })
      : tpl(s.v2StatReactionShort, { pct: stat.pct, stance: stanceLabel })

  const wrapperStyle: CSSProperties =
    variant === 'mobile'
      ? {
          marginTop: 14,
          padding: 14,
          borderRadius: 13,
          background: '#f6f8fb',
          border: '1px solid #eef1f6'
        }
      : {}

  return (
    <div style={wrapperStyle}>
      <div style={{ display: 'flex', gap: 9 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: INDIGO, flex: 'none' }}>
          #{stat.num}
        </div>
        <div
          style={{
            fontSize: 14,
            lineHeight: 1.7,
            color: '#25304a',
            fontWeight: 500
          }}
        >
          {stat.text}
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginTop: 11,
          paddingTop: 11,
          borderTop: '1px dashed #dde3ec'
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 7,
            flex: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 14,
            background: color
          }}
        >
          {icon}
        </div>
        <div style={{ fontSize: 14, color: '#5a6272' }}>{reaction}</div>
      </div>
    </div>
  )
}
