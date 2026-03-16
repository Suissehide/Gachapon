// ESM-compatible wrapper for jsonwebtoken (CJS module)
// Uses createRequire to load the real CJS jsonwebtoken synchronously, bypassing Jest's moduleNameMapper
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const jwt = require('jsonwebtoken') as typeof import('jsonwebtoken')

export const sign = jwt.sign.bind(jwt)
export const verify = jwt.verify.bind(jwt)
export const decode = jwt.decode.bind(jwt)
export const JsonWebTokenError = jwt.JsonWebTokenError
export const TokenExpiredError = jwt.TokenExpiredError
export const NotBeforeError = jwt.NotBeforeError
export default jwt
