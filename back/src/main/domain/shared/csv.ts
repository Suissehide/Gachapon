type CsvValue = string | number | boolean | Date | null

const escapeField = (value: CsvValue): string => {
  if (value === null) {
    return ''
  }
  const str =
    value instanceof Date
      ? value.toISOString()
      : typeof value === 'string'
        ? value
        : String(value)
  if (/[",\n\r]/.test(str)) {
    return `"${str.replaceAll('"', '""')}"`
  }
  return str
}

export const toCsv = (headers: string[], rows: CsvValue[][]): string => {
  const lines = [headers, ...rows].map((row) => row.map(escapeField).join(','))
  return `${lines.join('\r\n')}\r\n`
}
