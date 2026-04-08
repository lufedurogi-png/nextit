'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import {
    getStoredDarkMode,
    applyThemeToDocument,
    persistTheme,
    broadcastThemeChange,
} from '@/lib/appTheme'

const AdminThemeContext = createContext({ darkMode: false, setDarkMode: () => {} })

export function AdminThemeProvider({ children }) {
    const [darkMode, setDarkModeState] = useState(null)
    const effectiveDark = darkMode === null ? false : darkMode

    useEffect(() => {
        setDarkModeState(getStoredDarkMode())
    }, [])

    useEffect(() => {
        if (darkMode === null) return
        applyThemeToDocument(darkMode)
        persistTheme(darkMode)
        broadcastThemeChange(darkMode)
    }, [darkMode])

    useEffect(() => {
        const onCustom = (e) => {
            if (typeof e.detail === 'boolean') setDarkModeState(e.detail)
        }
        const onStorage = (ev) => {
            if (ev.key === 'darkMode' && ev.newValue !== null) {
                try {
                    setDarkModeState(JSON.parse(ev.newValue))
                } catch {
                    // ignorar
                }
            }
        }
        window.addEventListener('darkModeChange', onCustom)
        window.addEventListener('storage', onStorage)
        return () => {
            window.removeEventListener('darkModeChange', onCustom)
            window.removeEventListener('storage', onStorage)
        }
    }, [])

    const setDarkMode = (next) => {
        if (typeof next === 'function') {
            setDarkModeState((d) => {
                const cur = d === null ? getStoredDarkMode() : d
                return next(cur)
            })
        } else {
            setDarkModeState(next)
        }
    }

    return (
        <AdminThemeContext.Provider value={{ darkMode: effectiveDark, setDarkMode }}>
            {children}
        </AdminThemeContext.Provider>
    )
}

export function useAdminTheme() {
    const ctx = useContext(AdminThemeContext)
    if (!ctx) throw new Error('useAdminTheme must be used within AdminThemeProvider')
    return ctx
}
