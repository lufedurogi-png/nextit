'use client'

import { createContext, useContext, useState, useEffect, useLayoutEffect } from 'react'

const AdminThemeContext = createContext(null)

function leerTemaGuardado(storageKey, defaultDark) {
    if (typeof window === 'undefined') return defaultDark
    try {
        const saved = localStorage.getItem(storageKey)
        if (saved !== null) return JSON.parse(saved) === true
    } catch (_) {}
    return defaultDark
}

export function AdminThemeProvider({ children, storageKey = 'darkMode', defaultDark = true }) {
    const [darkMode, setDarkMode] = useState(defaultDark)
    const [listo, setListo] = useState(false)

    useLayoutEffect(() => {
        setDarkMode(leerTemaGuardado(storageKey, defaultDark))
        setListo(true)
    }, [storageKey, defaultDark])

    useEffect(() => {
        document.documentElement.classList.toggle('dark', darkMode)
        if (listo) {
            localStorage.setItem(storageKey, JSON.stringify(darkMode))
        }
    }, [darkMode, listo, storageKey])

    useEffect(() => {
        const handleStorageChange = (e) => {
            if (e.key === storageKey && e.newValue !== null) {
                try {
                    setDarkMode(JSON.parse(e.newValue) === true)
                } catch (_) {}
            }
        }
        window.addEventListener('storage', handleStorageChange)
        return () => window.removeEventListener('storage', handleStorageChange)
    }, [storageKey])

    return (
        <AdminThemeContext.Provider value={{ darkMode, setDarkMode }}>
            {children}
        </AdminThemeContext.Provider>
    )
}

export function useAdminTheme() {
    const ctx = useContext(AdminThemeContext)
    if (ctx == null) {
        throw new Error('useAdminTheme must be used within AdminThemeProvider')
    }
    return ctx
}
