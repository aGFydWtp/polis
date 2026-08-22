/**
 * Statement numbers shown to participants are 1-based, while tids are 0-based.
 * Every `#N` badge in the v2 screens goes through here so they stay in sync.
 */
export function statementNumber(tid: number): number {
  return tid + 1
}
