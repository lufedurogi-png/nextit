'use client'

import { useState, useLayoutEffect, useEffect } from 'react'

/**
 * Tema tienda alineado con SSR: el primer render coincide con el servidor (oscuro por defecto);
 * la preferencia guardada se aplica en useLayoutEffect antes del pintado visible.
 */
export function useTiendaDarkMode() {
    const [darkMode, setDarkMode] = useState(true)
    const [themeReady, setThemeReady] = useState(false)

    useLayoutEffect(() => {
        try {
            const saved = localStorage.getItem('darkMode')
            if (saved !== null) {
                setDarkMode(JSON.parse(saved))
            }
        } catch {
            // mantener true
        } finally {
            setThemeReady(true)
        }
    }, [])

    useEffect(() => {
        if (!themeReady) return
        if (darkMode) {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
        localStorage.setItem('darkMode', JSON.stringify(darkMode))
    }, [darkMode, themeReady])

    useEffect(() => {
        const onStorage = (e) => {
            if (e.key === 'darkMode' && e.newValue != null) {
                try {
                    setDarkMode(JSON.parse(e.newValue))
                } catch {
                    /* ignore */
                }
            }
        }
        window.addEventListener('storage', onStorage)
        return () => window.removeEventListener('storage', onStorage)
    }, [])

    return { darkMode, setDarkMode, themeReady }
}
