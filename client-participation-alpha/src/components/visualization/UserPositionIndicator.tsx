import { Group } from '@visx/group'
import { motion } from 'motion/react'
import type { UserPosition } from './types'

interface UserPositionIndicatorProps {
  userPosition: UserPosition
  /** Speech-bubble text shown persistently next to the marker (e.g. "あなた"). */
  label: string
}

// Marker radius (11) + ring stroke (4/2) + gap between marker and bubble tail
const MARKER_CLEARANCE = 19
const BUBBLE_FONT_SIZE = 12
const BUBBLE_PADDING_X = 8
const BUBBLE_HEIGHT = 24
const TAIL_HEIGHT = 6
const TAIL_HALF_WIDTH = 5

// Rough text-width estimate: CJK glyphs ≈ font size, Latin glyphs ≈ 0.62 × font size
function estimateTextWidth(label: string): number {
  return Array.from(label).reduce(
    (w, ch) => w + ((ch.codePointAt(0) ?? 0) > 0x2e80 ? BUBBLE_FONT_SIZE : BUBBLE_FONT_SIZE * 0.62),
    0
  )
}

export function UserPositionIndicator({ userPosition, label }: UserPositionIndicatorProps) {
  const bubbleWidth = Math.ceil(estimateTextWidth(label)) + BUBBLE_PADDING_X * 2

  // Flip the bubble below the marker when it would be clipped by the top edge
  // (the SVG has margin.top = 40px of headroom above local y = 0)
  const flipBelow = userPosition.y < MARKER_CLEARANCE + TAIL_HEIGHT + BUBBLE_HEIGHT - 36
  const dir = flipBelow ? 1 : -1
  const tailTipY = dir * MARKER_CLEARANCE
  const tailBaseY = dir * (MARKER_CLEARANCE + TAIL_HEIGHT)
  const rectY = flipBelow ? tailBaseY : tailBaseY - BUBBLE_HEIGHT
  const textY = rectY + BUBBLE_HEIGHT / 2

  return (
    <Group>
      <defs>
        <pattern
          id="user-profile-pattern"
          x="0"
          y="0"
          width="1"
          height="1"
          patternContentUnits="objectBoundingBox"
        >
          <image
            x="0"
            y="0"
            width="1"
            height="1"
            // Use a relative URL so it works when app is mounted at /alpha/ behind nginx
            xlinkHref="anonProfile.svg"
            preserveAspectRatio="xMidYMid slice"
          />
        </pattern>
        <filter id="grayscale-filter">
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>
      <motion.circle
        cx={userPosition.x}
        cy={userPosition.y}
        r={13}
        fill="none"
        stroke="#03a9f4"
        strokeWidth={4}
        initial={false}
        animate={{
          cx: userPosition.x,
          cy: userPosition.y
        }}
        transition={{
          duration: 0.8,
          ease: 'easeInOut'
        }}
      />
      <motion.circle
        cx={userPosition.x}
        cy={userPosition.y}
        r={11}
        fill="url(#user-profile-pattern)"
        filter="url(#grayscale-filter)"
        initial={false}
        animate={{
          cx: userPosition.x,
          cy: userPosition.y
        }}
        transition={{
          duration: 0.8,
          ease: 'easeInOut'
        }}
      />
      {/* Persistent "you" speech bubble following the marker */}
      <motion.g
        pointerEvents="none"
        initial={false}
        animate={{
          transform: `translate(${userPosition.x}px, ${userPosition.y}px)`
        }}
        transition={{
          duration: 0.8,
          ease: 'easeInOut'
        }}
      >
        <path
          d={`M ${-TAIL_HALF_WIDTH} ${tailBaseY} L ${TAIL_HALF_WIDTH} ${tailBaseY} L 0 ${tailTipY} Z`}
          fill="#03a9f4"
        />
        <rect
          x={-bubbleWidth / 2}
          y={rectY}
          width={bubbleWidth}
          height={BUBBLE_HEIGHT}
          rx={6}
          ry={6}
          fill="#03a9f4"
        />
        <text
          x={0}
          y={textY}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#ffffff"
          fontSize={BUBBLE_FONT_SIZE}
          fontWeight={600}
        >
          {label}
        </text>
      </motion.g>
    </Group>
  )
}
