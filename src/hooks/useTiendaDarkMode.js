'use client'

import { useState, useLayoutEffect, useEffect, useCallback, useRef } from 'react'

function leerTemaGuardado(defaultDark = true) {
    try {
        const saved = localStorage.getItem('darkMode')
        if (saved !== null) return JSON.parse(saved) === true
    } catch {
        // ignore
    }
    return defaultDark
}

function aplicarTema(next) {
    try {
        localStorage.setItem('darkMode', JSON.stringify(next))
    } catch {
        // ignore
    }
    if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('dark', next)
    }
}

/**
 * Tema tienda alineado con SSR: el primer render coincide con el servidor (oscuro por defecto);
 * la preferencia guardada se aplica en useLayoutEffect antes del pintado visible.
 * Se sincroniza entre componentes vía `darkModeChange` y `storage`.
 */
export function useTiendaDarkMode() {
    const [darkMode, setDarkModeState] = useState(true)
    const [themeReady, setThemeReady] = useState(false)
    const darkModeRef = useRef(darkMode)
    darkModeRef.current = darkMode

    const setDarkMode = useCallback((value) => {
        const prev = darkModeRef.current
        const next = typeof value === 'function' ? value(prev) : !!value
        if (next === prev) return
        darkModeRef.current = next
        aplicarTema(next)
        setDarkModeState(next)
        try {
            window.dispatchEvent(new CustomEvent('darkModeChange', { detail: next }))
        } catch {
            // ignore
        }
    }, [])

    useLayoutEffect(() => {
        const initial = leerTemaGuardado(true)
        darkModeRef.current = initial
        setDarkModeState(initial)
        aplicarTema(initial)
        setThemeReady(true)
    }, [])

    useEffect(() => {
        const syncFromEvent = (e) => {
            const next = !!e.detail
            if (next === darkModeRef.current) return
            darkModeRef.current = next
            document.documentElement.classList.toggle('dark', next)
            setDarkModeState(next)
        }
        const syncFromStorage = (e) => {
            if (e.key !== 'darkMode' || e.newValue == null) return
            try {
                const next = JSON.parse(e.newValue) === true
                if (next === darkModeRef.current) return
                darkModeRef.current = next
                document.documentElement.classList.toggle('dark', next)
                setDarkModeState(next)
            } catch {
                // ignore
            }
        }
        window.addEventListener('darkModeChange', syncFromEvent)
        window.addEventListener('storage', syncFromStorage)
        return () => {
            window.removeEventListener('darkModeChange', syncFromEvent)
            window.removeEventListener('storage', syncFromStorage)
        }
    }, [])

    return { darkMode, setDarkMode, themeReady }
}

/**
 * Solo lectura: sigue `html.dark` y el evento de tema (ideal para widgets flotantes).
 */
export function useDocumentDarkMode() {
    const [darkMode, setDarkMode] = useState(true)

    useLayoutEffect(() => {
        const read = () => document.documentElement.classList.contains('dark')
        setDarkMode(read())

        const onChange = (e) => {
            if (typeof e?.detail === 'boolean') {
                setDarkMode(e.detail)
                return
            }
            setDarkMode(read())
        }

        window.addEventListener('darkModeChange', onChange)
        const mo = new MutationObserver(() => setDarkMode(read()))
        mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

        return () => {
            window.removeEventListener('darkModeChange', onChange)
            mo.disconnect()
        }
    }, [])

    return darkMode
}
