import { describe, expect, it } from '@jest/globals'

import { toCsv } from '../../main/domain/shared/csv'

describe('toCsv', () => {
  it('génère headers + lignes', () => {
    const csv = toCsv(['a', 'b'], [['x', 1], ['y', 2]])
    expect(csv).toBe('a,b\r\nx,1\r\ny,2\r\n')
  })

  it('échappe virgules, quotes et retours ligne', () => {
    const csv = toCsv(['v'], [['a,b'], ['say "hi"'], ['line\nbreak']])
    expect(csv).toBe('v\r\n"a,b"\r\n"say ""hi"""\r\n"line\nbreak"\r\n')
  })

  it('null → vide, Date → ISO, boolean → true/false', () => {
    const d = new Date('2026-01-02T03:04:05.000Z')
    const csv = toCsv(['v'], [[null], [d], [true]])
    expect(csv).toBe('v\r\n\r\n2026-01-02T03:04:05.000Z\r\ntrue\r\n')
  })

  it('anti-injection CSV : préfixe apostrophe sur les strings débutant par =, +, -, @', () => {
    const csv = toCsv(
      ['formula', 'plus', 'minus', 'at', 'negnum'],
      [["=cmd()", '+1', '-5str', '@user', -5]],
    )
    // strings starting with formula chars get an apostrophe prefix; numbers do not
    expect(csv).toBe("formula,plus,minus,at,negnum\r\n'=cmd(),'+1,'-5str,'@user,-5\r\n")
  })
})
