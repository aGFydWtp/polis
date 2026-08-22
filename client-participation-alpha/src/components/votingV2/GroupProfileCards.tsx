import type { Translations } from '../../strings/types'
import type { GroupProfile } from './useVotingScreen'

const INK = '#1f2a44'

function tpl(str: string, vars: Record<string, string | number>): string {
  return str.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => String(vars[k] ?? ''))
}

/**
 * One opinion group's representative-comment card: a white card (matching the
 * app's existing card style) with a neutral header band — there is no
 * per-group color system in the map (groupColors are all grayscale, see
 * src/components/visualization/constants.ts) — followed by a centered label
 * and a vertical list of the group's top representative comments.
 */
function GroupProfileCard({ s, profile }: { s: Translations; profile: GroupProfile }) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 18,
        border: '1px solid #e7ebf2',
        boxShadow: '0 4px 16px rgba(31,42,68,.07)',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          background: INK,
          padding: '14px 16px',
          fontSize: 16,
          fontWeight: 700,
          color: '#fff'
        }}
      >
        {tpl(s.v2GroupRepOpinionsTitle, { name: profile.name })}
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {profile.repComments.map((c, i) => (
            <div
              key={i}
              style={{
                background: '#f6f8fb',
                border: '1px solid #eef1f6',
                borderRadius: 13,
                padding: 14,
                fontSize: 16,
                lineHeight: 1.7,
                color: '#25304a'
              }}
            >
              {c.text}
              {c.stance === 'disagree' && (
                <b style={{ color: '#d9463b' }}> {s.v2GroupRepDisagreeSuffix}</b>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

interface GroupProfileCardsProps {
  s: Translations
  profiles: GroupProfile[]
  /** Cards per row; 2 at desktop widths, 1 (stacked) on mobile. */
  columns?: 1 | 2
}

/**
 * Per-opinion-group representative-comment cards, rendered below the opinion
 * groups map/controls card and above the cross-group consensus section.
 * Groups with no representative comments are skipped entirely.
 */
export default function GroupProfileCards({ s, profiles, columns = 1 }: GroupProfileCardsProps) {
  const withComments = profiles.filter((p) => p.repComments.length > 0)
  if (withComments.length === 0) return null

  return (
    <div
      style={{
        marginTop: 24,
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: 20
      }}
    >
      {withComments.map((profile) => (
        <GroupProfileCard key={profile.groupId} s={s} profile={profile} />
      ))}
    </div>
  )
}
