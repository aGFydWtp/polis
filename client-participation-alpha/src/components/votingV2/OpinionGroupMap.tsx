import { Group } from '@visx/group'
import { GroupHulls } from '../visualization/GroupHulls'
import { GroupLabels } from '../visualization/GroupLabels'
import { UserPositionIndicator } from '../visualization/UserPositionIndicator'
import { VoteBarCharts } from '../visualization/VoteBarCharts'
import { height, margin, width, xMax, yMax } from '../visualization/constants'
import type { GroupVoteInfo, Hull, UserPosition } from '../visualization/types'

interface OpinionGroupMapProps {
  hulls: Hull[]
  originX: number
  originY: number
  userPosition: UserPosition | null
  groupVoteData: GroupVoteInfo[]
  selectedGroup: number | null
  /** When a statement is selected, per-group vote bars are overlaid on the map. */
  statementSelected: boolean
}

/**
 * Map-only extraction of the PCA opinion-group visualization: the hull polygons,
 * origin axes, the participant's own position and (when a statement is selected)
 * per-group vote bars. Selection is driven by the parent via props — the mock UI
 * (group buttons / chips / stats) lives outside this component.
 */
export default function OpinionGroupMap({
  hulls,
  originX,
  originY,
  userPosition,
  groupVoteData,
  selectedGroup,
  statementSelected
}: OpinionGroupMapProps) {
  return (
    <svg
      width={width}
      height={height}
      style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
      viewBox={`0 0 ${width} ${height}`}
    >
      <Group left={margin.left} top={margin.top}>
        {/* Origin lines */}
        {originX >= 0 && originX <= xMax && (
          <line x1={originX} y1={0} x2={originX} y2={yMax} stroke="#e6eaf1" strokeWidth={1.5} />
        )}
        {originY >= 0 && originY <= yMax && (
          <line x1={0} y1={originY} x2={xMax} y2={originY} stroke="#e6eaf1" strokeWidth={1.5} />
        )}

        {/* Group hull polygons (animated) */}
        <GroupHulls hulls={hulls} selectedGroup={selectedGroup} />

        {/* User position indicator */}
        {userPosition && <UserPositionIndicator userPosition={userPosition} />}

        {/* Group letter labels (A / B / C …) */}
        <GroupLabels hulls={hulls} selectedGroup={selectedGroup} userPosition={userPosition} />

        {/* Per-group vote bars for the selected statement */}
        {statementSelected && <VoteBarCharts hulls={hulls} groupVoteData={groupVoteData} />}
      </Group>
    </svg>
  )
}
