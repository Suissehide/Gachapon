// ESM-compatible wrapper for jsonwebtoken (CJS module)
// We import it as default (CJS modules get wrapped as default exports in ESM)
// Using a path that bypasses the moduleNameMapper to avoid circular dependency
import jwtDefault from '/Users/couffinhal/.config/superpowers/worktrees/Gachapon/plan1-foundation/back/node_modules/jsonwebtoken/index.js'

const jwt = jwtDefault as any
export const sign = (...args: any[]) => jwt.sign(...args)
export const verify = (...args: any[]) => jwt.verify(...args)
export const decode = (...args: any[]) => jwt.decode(...args)
export const JsonWebTokenError = jwt.JsonWebTokenError
export const TokenExpiredError = jwt.TokenExpiredError
export const NotBeforeError = jwt.NotBeforeError
export default jwt
