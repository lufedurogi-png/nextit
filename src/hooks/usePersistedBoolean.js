'use client'

import { useState, useLayoutEffect, useEffect } from 'react'

/**
 * Boolean en localStorage sin mismatch de hidratación (primer render = serverDefault en servidor y cliente).
 */
export function usePersistedBoolean(storageKey, serverDefault = false) {
    const [value, setValue] = useState(serverDefault)
    const [ready, setReady] = useState(false)

    useLayoutEffect(() => {
        try {
            const saved = localStorage.getItem(storageKey)
            if (saved !== null) {
                setValue(JSON.parse(saved))
            }
        } catch {
            // mantener serverDefault
        }
        setReady(true)
    }, [storageKey])

    useEffect(() => {
        if (!ready) return
        localStorage.setItem(storageKey, JSON.stringify(value))
    }, [storageKey, value, ready])

    useEffect(() => {
        const onStorage = (e) => {
            if (e.key === storageKey && e.newValue != null) {
                try {
                    setValue(JSON.parse(e.newValue))
                } catch {
                    /* ignore */
                }
            }
        }
        window.addEventListener('storage', onStorage)
        return () => window.removeEventListener('storage', onStorage)
    }, [storageKey])

    return [value, setValue]
}
