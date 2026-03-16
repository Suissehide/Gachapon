// ESM-compatible wrapper for jsonwebtoken (CJS module)
// Resolves the real jsonwebtoken path relative to this file, bypassing Jest's moduleNameMapper
import { fileURLToPath } from 'url'
import path from 'path'

// From back/src/test/__mocks__/ go up 3 levels to back/, then into node_modules
const mockDir = path.dirname(fileURLToPath(import.meta.url))
const jwtPath = path.resolve(mockDir, '../../../node_modules/jsonwebtoken/index.js')
const jwt = (await import(jwtPath)).default ?? (await import(jwtPath))

export const sign = (...args: any[]) => jwt.sign(...args)
export const verify = (...args: any[]) => jwt.verify(...args)
export const decode = (...args: any[]) => jwt.decode(...args)
export const JsonWebTokenError = jwt.JsonWebTokenError
export const TokenExpiredError = jwt.TokenExpiredError
export const NotBeforeError = jwt.NotBeforeError
export default jwt
