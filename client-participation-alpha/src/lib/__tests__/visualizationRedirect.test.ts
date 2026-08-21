import {
  hasReturnedFromVisualization,
  markReturnedFromVisualization,
  shouldRedirectToVisualization
} from '../visualizationRedirect'

describe('visualization redirect', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    jest.restoreAllMocks()
  })

  describe('markReturnedFromVisualization / hasReturnedFromVisualization', () => {
    it('is false before the back button is used', () => {
      expect(hasReturnedFromVisualization('9zdemo')).toBe(false)
    })

    it('is true after the back button is used', () => {
      markReturnedFromVisualization('9zdemo')
      expect(hasReturnedFromVisualization('9zdemo')).toBe(true)
    })

    it('stores the flag under a conversation-scoped sessionStorage key', () => {
      markReturnedFromVisualization('9zdemo')
      expect(window.sessionStorage.getItem('returned_from_visualization_9zdemo')).not.toBeNull()
    })

    it('does not leak between conversations', () => {
      markReturnedFromVisualization('9zdemo')
      expect(hasReturnedFromVisualization('7abcd')).toBe(false)
    })

    it('does not use localStorage', () => {
      markReturnedFromVisualization('9zdemo')
      expect(window.localStorage.getItem('returned_from_visualization_9zdemo')).toBeNull()
    })

    it('survives repeated marks', () => {
      markReturnedFromVisualization('9zdemo')
      markReturnedFromVisualization('9zdemo')
      expect(hasReturnedFromVisualization('9zdemo')).toBe(true)
    })

    it('swallows storage errors when writing', () => {
      jest.spyOn(console, 'warn').mockImplementation(() => {})
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('storage denied')
      })
      expect(() => markReturnedFromVisualization('9zdemo')).not.toThrow()
    })

    it('reports "not returned" when reading throws', () => {
      jest.spyOn(console, 'warn').mockImplementation(() => {})
      jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('storage denied')
      })
      expect(hasReturnedFromVisualization('9zdemo')).toBe(false)
    })
  })

  describe('shouldRedirectToVisualization', () => {
    const allAnswered = {
      votingEnabled: true,
      visualizationEnabled: true,
      hasNextStatement: false,
      returnedFromVisualization: false
    }

    it('redirects when everything is answered on a voting page with a visualization', () => {
      expect(shouldRedirectToVisualization(allAnswered)).toBe(true)
    })

    it('does not redirect while statements are left', () => {
      expect(shouldRedirectToVisualization({ ...allAnswered, hasNextStatement: true })).toBe(false)
    })

    it('does not redirect when the conversation has no visualization (vis_type !== 1)', () => {
      expect(shouldRedirectToVisualization({ ...allAnswered, visualizationEnabled: false })).toBe(
        false
      )
    })

    it('does not redirect from the view-only visualization page itself', () => {
      expect(shouldRedirectToVisualization({ ...allAnswered, votingEnabled: false })).toBe(false)
    })

    it('does not redirect after the back button was used', () => {
      expect(
        shouldRedirectToVisualization({ ...allAnswered, returnedFromVisualization: true })
      ).toBe(false)
    })
  })
})
