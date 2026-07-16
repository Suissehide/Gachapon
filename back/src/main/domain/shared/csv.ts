type CsvValue = string | number | boolean | Date | null

const FORMULA_CHARS = /^[=+\-@]/

const escapeField = (value: CsvValue): string => {
  if (value === null) {
    return ''
  }
  const isString = typeof value === 'string'
  const str =
    value instanceof Date
      ? value.toISOString()
      : isString
        ? value
        : String(value)
  const sanitized = isString && FORMULA_CHARS.test(str) ? `'${str}` : str
  if (/[",\n\r]/.test(sanitized)) {
    return `"${sanitized.replaceAll('"', '""')}"`
  }
  return sanitized
}

export const toCsv = (headers: string[], rows: CsvValue[][]): string => {
  const lines = [headers, ...rows].map((row) => row.map(escapeField).join(','))
  return `${lines.join('\r\n')}\r\n`
}
