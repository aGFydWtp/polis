/**
 * Timings and CSS for the vote → next-statement card swap.
 *
 * The swap is not decoration. Without it the next statement's buttons appear
 * at the same coordinates under the finger that has just tapped, so a second
 * tap aimed at the answered card lands as an answer to a statement the
 * participant has not read yet. Moving the card and holding input for a beat
 * breaks that "tap here again" reflex.
 *
 * The lock these timings drive lives in `useVotingScreen` — above both cards —
 * because a per-card guard is unmounted by exactly the transition it has to
 * cover.
 */

/**
 * The answered card fades out to the left before the next one is mounted, and
 * the next one arrives from the right — the statements read as a deck being
 * paged through. Both travels stay inside the white card's 16px padding, so
 * neither block crosses its border on the way past.
 */
export const VOTE_LEAVE_MS = 140
/** The next card slides into place; input goes live once it comes to rest. */
export const VOTE_ENTER_MS = 240
/** Floor on the gap between two accepted taps, measured across cards. */
export const VOTE_GUARD_MS = 450

/**
 * Reduced motion shortens the animations but not the lock: the guard is about
 * mis-taps, not about movement, so it holds for VOTE_GUARD_MS either way.
 */
export const VOTE_SWAP_CSS =
  '@keyframes v2card-leave{from{opacity:1;transform:none}' +
  'to{opacity:0;transform:translateX(-14px)}}' +
  '@keyframes v2card-enter{from{opacity:0;transform:translateX(14px)}' +
  'to{opacity:1;transform:none}}' +
  `.v2card-leave{animation:v2card-leave ${VOTE_LEAVE_MS}ms ease-in both}` +
  `.v2card-enter{animation:v2card-enter ${VOTE_ENTER_MS}ms cubic-bezier(.22,.61,.36,1) both}` +
  '@media (prefers-reduced-motion:reduce){' +
  '.v2card-leave,.v2card-enter{animation-duration:1ms}}'
