import type { CSSProperties } from 'react'
import type { Translations } from '../../strings/types'
import type { ConsensusStatement } from './useVotingScreen'
import { statementNumber } from './statementNumber'

/**
 * みんなの共通意見 (cross-group consensus) section — design pattern 6d
 * (ドーナツ強調型・改): one card per consensus statement, with an overlapping
 * #N badge, the statement text, a stacked-arc donut and a stance legend.
 */

const INK = '#1f2a44'
const AGREE_COLOR = '#2f9e6f'
const DISAGREE_COLOR = '#d9463b'
const PASS_COLOR = '#c2c8d4'
const TRACK_COLOR = '#eef1f6'

/** Donut ring radius in the 72×72 viewBox; circumference ≈ 163.4. */
const RADIUS = 26
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

interface SizeSpec {
  cardPadding: number
  cardMarginTop: number
  badgeFontSize: number
  badgePadding: string
  badgeTop: number
  badgeLeft: number
  statementFontSize: number
  donutSize: number
  centerNumberSize: number
  centerPctSize: number
  centerLabelSize: number
  legendFontSize: number
  swatchSize: number
  bodyGap: number
}

const SIZES: Record<'desktop' | 'mobile', SizeSpec> = {
  desktop: {
    cardPadding: 20,
    cardMarginTop: 30,
    badgeFontSize: 20,
    badgePadding: '6px 16px',
    badgeTop: -18,
    badgeLeft: 20,
    statementFontSize: 20,
    donutSize: 128,
    centerNumberSize: 32,
    centerPctSize: 17,
    centerLabelSize: 14,
    legendFontSize: 16,
    swatchSize: 12,
    bodyGap: 20
  },
  mobile: {
    cardPadding: 18,
    cardMarginTop: 26,
    badgeFontSize: 19,
    badgePadding: '6px 15px',
    badgeTop: -16,
    badgeLeft: 18,
    statementFontSize: 18,
    donutSize: 112,
    centerNumberSize: 28,
    centerPctSize: 15,
    centerLabelSize: 13,
    legendFontSize: 15,
    swatchSize: 11,
    bodyGap: 16
  }
}

/** Stacked donut: agree (green, round cap) → disagree (red) → pass (gray). */
function Donut({
  s,
  item,
  size,
  highlightDominant = false
}: {
  s: Translations
  item: ConsensusStatement
  size: SizeSpec
  /** Show the majority side (agree or disagree) in the center instead of always agree. */
  highlightDominant?: boolean
}) {
  const total = item.agree + item.disagree + item.pass
  const showDisagree = highlightDominant && item.disagree > item.agree
  const centerPct = showDisagree ? item.disagreePct : item.agreePct
  const centerColor = showDisagree ? DISAGREE_COLOR : AGREE_COLOR
  const centerLabel = showDisagree ? s.v2ConsensusCenterDisagree : s.v2ConsensusCenterAgree
  // Three-digit values (100%) overflow the donut hole at the regular size
  const centerNumberSize =
    centerPct >= 100 ? Math.round(size.centerNumberSize * 0.75) : size.centerNumberSize
  const arcs = [
    { color: AGREE_COLOR, count: item.agree, round: true },
    { color: DISAGREE_COLOR, count: item.disagree, round: false },
    { color: PASS_COLOR, count: item.pass, round: false }
  ]
  let offset = 0

  return (
    <div
      style={{ position: 'relative', flex: 'none', width: size.donutSize, height: size.donutSize }}
    >
      <svg width={size.donutSize} height={size.donutSize} viewBox="0 0 72 72" aria-hidden="true">
        <g transform="rotate(-90 36 36)">
          <circle cx="36" cy="36" r={RADIUS} fill="none" stroke={TRACK_COLOR} strokeWidth="10" />
          {arcs.map((arc, i) => {
            if (arc.count <= 0) return null
            const len = (arc.count / total) * CIRCUMFERENCE
            const dashOffset = -offset
            offset += len
            return (
              <circle
                key={i}
                cx="36"
                cy="36"
                r={RADIUS}
                fill="none"
                stroke={arc.color}
                strokeWidth="10"
                strokeDasharray={`${len} ${CIRCUMFERENCE}`}
                strokeDashoffset={dashOffset}
                strokeLinecap={arc.round ? 'round' : undefined}
              />
            )
          })}
        </g>
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: 1
        }}
      >
        <span style={{ fontSize: centerNumberSize, fontWeight: 700, color: centerColor }}>
          {centerPct}
          <span style={{ fontSize: size.centerPctSize }}>%</span>
        </span>
        <span
          style={{
            fontSize: size.centerLabelSize,
            color: '#5a6272',
            fontWeight: 500,
            marginTop: 3
          }}
        >
          {centerLabel}
        </span>
      </div>
    </div>
  )
}

function LegendRow({
  color,
  label,
  pct,
  count,
  countTemplate,
  size
}: {
  color: string
  label: string
  pct: number
  count: number
  countTemplate: string
  size: SizeSpec
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <span
        style={{
          width: size.swatchSize,
          height: size.swatchSize,
          borderRadius: 3,
          background: color,
          flex: 'none'
        }}
      />
      <span style={{ fontSize: size.legendFontSize, color: '#5a6272', flex: 1 }}>{label}</span>
      <span style={{ fontSize: size.legendFontSize, color: '#3a4257' }}>
        {pct}%<span style={{ marginLeft: 4 }}>{countTemplate.replace('{{n}}', String(count))}</span>
      </span>
    </div>
  )
}

function ConsensusCard({
  s,
  item,
  size,
  highlightDominant
}: {
  s: Translations
  item: ConsensusStatement
  size: SizeSpec
  highlightDominant?: boolean
}) {
  const cardStyle: CSSProperties = {
    background: '#fff',
    borderRadius: 18,
    padding: size.cardPadding,
    boxShadow: '0 4px 16px rgba(31,42,68,.06)',
    border: '1px solid #e7ebf2',
    marginTop: size.cardMarginTop,
    position: 'relative'
  }
  return (
    <div style={cardStyle}>
      <div
        style={{
          position: 'absolute',
          top: size.badgeTop,
          left: size.badgeLeft,
          background: '#38415a',
          color: '#fff',
          fontSize: size.badgeFontSize,
          fontStyle: 'italic',
          fontWeight: 700,
          lineHeight: 1,
          padding: size.badgePadding,
          boxShadow: '0 8px 18px -6px rgba(31,42,68,.4)'
        }}
      >
        #{statementNumber(item.tid)}
      </div>
      <div
        style={{
          fontSize: size.statementFontSize,
          lineHeight: 1.6,
          color: '#25304a',
          fontWeight: 500
        }}
      >
        {item.text}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: size.bodyGap,
          marginTop: size.bodyGap
        }}
      >
        <Donut s={s} item={item} size={size} highlightDominant={highlightDominant} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 11 }}>
          <LegendRow
            color={AGREE_COLOR}
            label={s.agree}
            pct={item.agreePct}
            count={item.agree}
            countTemplate={s.v2ConsensusCount}
            size={size}
          />
          <LegendRow
            color={DISAGREE_COLOR}
            label={s.disagree}
            pct={item.disagreePct}
            count={item.disagree}
            countTemplate={s.v2ConsensusCount}
            size={size}
          />
          <LegendRow
            color={PASS_COLOR}
            label={s.pass}
            pct={item.passPct}
            count={item.pass}
            countTemplate={s.v2ConsensusCount}
            size={size}
          />
        </div>
      </div>
    </div>
  )
}

interface ConsensusSectionProps {
  s: Translations
  items: ConsensusStatement[]
  variant: 'desktop' | 'mobile'
  /** Cards per row; 2 while the desktop vote card is closed and width allows. */
  columns?: 1 | 2
  /** Section heading; defaults to the cross-group consensus title. */
  title?: string
  /** Explanatory subtitle under the heading; defaults to the consensus subtitle. */
  subtitle?: string
  /** Donut centers show the majority side (agree or disagree) instead of always agree. */
  highlightDominant?: boolean
}

export default function ConsensusSection({
  s,
  items,
  variant,
  columns = 1,
  title,
  subtitle,
  highlightDominant
}: ConsensusSectionProps) {
  if (items.length === 0) return null
  const size = SIZES[variant]

  return (
    <div style={{ marginTop: 48 }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: INK }}>{title ?? s.v2ConsensusTitle}</div>
      <div style={{ fontSize: 14, lineHeight: 1.6, color: '#8794ad', marginTop: 4 }}>
        {subtitle ?? s.v2ConsensusSubtitle}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          columnGap: 20
        }}
      >
        {items.map((item) => (
          <ConsensusCard
            key={item.tid}
            s={s}
            item={item}
            size={size}
            highlightDominant={highlightDominant}
          />
        ))}
      </div>
    </div>
  )
}
