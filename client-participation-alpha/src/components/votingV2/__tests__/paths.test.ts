import { conversationPath, visualizationPath } from '../paths'

describe('votingV2 paths', () => {
  it('builds root-mounted paths', () => {
    expect(conversationPath('', '9zdemo')).toBe('/9zdemo')
    expect(visualizationPath('', '9zdemo')).toBe('/9zdemo/visualization')
  })

  it('keeps the proxy mount point (production /alpha)', () => {
    expect(conversationPath('/alpha', '9zdemo')).toBe('/alpha/9zdemo')
    expect(visualizationPath('/alpha', '9zdemo')).toBe('/alpha/9zdemo/visualization')
  })
})
