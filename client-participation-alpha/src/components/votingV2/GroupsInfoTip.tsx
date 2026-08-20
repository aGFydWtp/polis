import type { SyntheticEvent } from 'react'
import type { Translations } from '../../strings/types'

/** Hover/focus tooltip for the opinion-group ⓘ icon (ported from the 5a mock). */
const GTIP_CSS = `
.v2gtip{position:relative;display:inline-flex}
.v2gtip>.v2gtipbox{position:absolute;top:calc(100% + 8px);left:-4px;width:264px;background:#1f2a44;color:#dbe2ef;font-size:12px;line-height:1.75;font-weight:400;text-align:left;padding:13px 15px;border-radius:11px;box-shadow:0 14px 34px -10px rgba(20,24,40,.55);opacity:0;visibility:hidden;transform:translateY(-4px);transition:opacity .16s ease,transform .16s ease,visibility .16s;z-index:60;pointer-events:none}
.v2gtip:hover>.v2gtipbox,.v2gtip:focus-within>.v2gtipbox{opacity:1;visibility:visible;transform:translateY(0)}
.v2gtipbox p{margin:0 0 9px}
.v2gtipbox p:last-child{margin:0}
@media (max-width:480px){
.v2gtip>.v2gtipbox{position:fixed;left:16px;right:16px;top:var(--v2gtip-top,50%);width:auto}
}
`

/**
 * The ⓘ icon next to the "opinion groups" title, with the explanation tooltip
 * on hover/focus (tap on touch devices). Used by VotingLayout; includes
 * its own styles.
 */
export default function GroupsInfoTip({ s }: { s: Translations }) {
  // On narrow screens the tooltip switches to position:fixed (see the media
  // query above), so its top edge must be anchored to the icon's viewport
  // position at the moment it opens.
  const place = (e: SyntheticEvent<HTMLSpanElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--v2gtip-top', `${rect.bottom + 8}px`)
  }
  return (
    <>
      <style>{GTIP_CSS}</style>
      <span
        className="v2gtip"
        tabIndex={0}
        role="button"
        aria-label={s.opinionGroups}
        style={{ outline: 'none' }}
        onMouseEnter={place}
        onFocus={place}
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
    </>
  )
}
