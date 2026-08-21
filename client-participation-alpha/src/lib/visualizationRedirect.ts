/**
 * A participant who has already answered every statement has nothing to do on
 * /:id, so the voting page sends them straight to /:id/visualization. The back
 * button on that page has to be able to switch the redirect off, otherwise it
 * would bounce them right back — it records a per-conversation session flag
 * here, which the voting page checks before redirecting.
 *
 * The flag lives in sessionStorage (per tab, cleared when the tab closes) and
 * is deliberately never cleared during the session: a participant who walked
 * back to the voting page should stay there, reloads included.
 */
const RETURNED_FROM_VISUALIZATION_PREFIX = 'returned_from_visualization_'

function returnedFromVisualizationKey(conversation_id: string): string {
  return `${RETURNED_FROM_VISUALIZATION_PREFIX}${conversation_id}`
}

/** Records that the participant left /:id/visualization via the back button. */
export function markReturnedFromVisualization(conversation_id: string): void {
  if (typeof window === 'undefined') {
    return
  }
  try {
    window.sessionStorage.setItem(returnedFromVisualizationKey(conversation_id), '1')
  } catch (e) {
    // Private browsing and storage-blocking settings can throw here; the flag
    // is only an optimisation, so degrade to "not returned".
    console.warn('[PolisStorage] Error recording visualization back navigation:', e)
  }
}

/** Whether the back button on /:id/visualization was used in this tab. */
export function hasReturnedFromVisualization(conversation_id: string): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  try {
    return window.sessionStorage.getItem(returnedFromVisualizationKey(conversation_id)) !== null
  } catch (e) {
    console.warn('[PolisStorage] Error reading visualization back navigation flag:', e)
    return false
  }
}

/**
 * Sends the browser to the visualization page.
 *
 * `replace()`, not `assign()` or an `href` assignment: /:id must not stay in
 * the history stack, or Back from the visualization would land on it and be
 * redirected straight back.
 */
export function redirectToVisualization(href: string): void {
  if (typeof window === 'undefined') {
    return
  }
  window.location.replace(href)
}

export interface VisualizationRedirectInput {
  /** False on the view-only /:id/visualization page, which never redirects. */
  votingEnabled: boolean
  /** vis_type === 1 — without it there is no visualization page to go to. */
  visualizationEnabled: boolean
  /** Whether the first /nextComment fetch returned a statement to vote on. */
  hasNextStatement: boolean
  /** Whether the back button was used in this tab (see the flag above). */
  returnedFromVisualization: boolean
}

/**
 * Whether the initial client-side /nextComment response should send the
 * participant to the visualization page instead of the "all answered" card.
 *
 * Only ever consulted for that first fetch: finishing the last statement by
 * voting keeps showing the done card, as before.
 */
export function shouldRedirectToVisualization({
  votingEnabled,
  visualizationEnabled,
  hasNextStatement,
  returnedFromVisualization
}: VisualizationRedirectInput): boolean {
  return votingEnabled && visualizationEnabled && !hasNextStatement && !returnedFromVisualization
}
