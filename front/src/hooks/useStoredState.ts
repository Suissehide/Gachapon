import { type Dispatch, type SetStateAction, useEffect, useState } from 'react'

// Comme useState, mais la valeur (union de strings) est persistée dans
// localStorage sous `key`. Une valeur stockée absente ou hors de
// `validValues` retombe sur `defaultValue` — protège contre une option
// supprimée ou une clé corrompue. localStorage indisponible (mode privé
// strict) → état non persisté mais fonctionnel.
export function useStoredState<T extends string>(
  key: string,
  defaultValue: T,
  validValues: readonly T[],
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key)
      if (
        stored !== null &&
        (validValues as readonly string[]).includes(stored)
      ) {
        return stored as T
      }
    } catch {
      // localStorage inaccessible : on garde le défaut
    }
    return defaultValue
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, value)
    } catch {
      // localStorage inaccessible : pas de persistance
    }
  }, [key, value])

  return [value, setValue]
}
