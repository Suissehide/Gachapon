export const serviceStatus = (
  ok: boolean,
  latencyMs: number,
  degradedThresholdMs = 500,
): 'ok' | 'degraded' | 'down' => {
  if (!ok) {
    return 'down'
  }
  return latencyMs > degradedThresholdMs ? 'degraded' : 'ok'
}

export const checkWithTimeout = async (
  check: () => Promise<boolean>,
  timeoutMs = 2000,
): Promise<{ ok: boolean; latencyMs: number }> => {
  const start = Date.now()
  try {
    const checkPromise = check()
    checkPromise.catch(() => {
      // Absorb late rejections so they don't bubble as unhandledRejection
    })
    const timeout = new Promise<boolean>((resolve) => {
      setTimeout(() => resolve(false), timeoutMs).unref?.()
    })
    const ok = await Promise.race([checkPromise, timeout])
    return { ok, latencyMs: Date.now() - start }
  } catch {
    return { ok: false, latencyMs: Date.now() - start }
  }
}
