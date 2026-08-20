import { useEffect, useState } from 'react'
import type { Translations } from '../../strings/types'
import ConsensusSection from './ConsensusSection'
import GroupControls, { StatCard } from './GroupControls'
import GroupProfileCards from './GroupProfileCards'
import GroupsInfoTip from './GroupsInfoTip'
import OpinionGroupMap from './OpinionGroupMap'
import type { useVotingScreen } from './useVotingScreen'

const INK = '#1f2a44'

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

interface OpinionGroupsSectionProps {
  s: Translations
  vm: VM
}

/**
 * The data-display half of the voting screen: the opinion-group map with its
 * controls, per-group representative-comment cards, and the consensus
 * sections. Shared between the voting screen and the standalone
 * /:id/visualization page.
 */
export default function OpinionGroupsSection({ s, vm }: OpinionGroupsSectionProps) {
  const showMap = vm.groupsEnabled && vm.hasPca
  const isDesktop = useIsDesktop()

  return (
    <>
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
    </>
  )
}
