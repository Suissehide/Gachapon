import { createRequire } from 'module'
import { dirname } from 'path'

const require = createRequire(import.meta.url)
const findRoot = require('find-root')
const mockDir = dirname(new URL(import.meta.url).pathname)

const findNearestBaseDir = (from = mockDir): string | undefined => {
  try {
    return findRoot(from)
  } catch {
    return undefined
  }
}

export default findNearestBaseDir() ?? process.cwd()
