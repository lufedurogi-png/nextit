'use client'

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react'

export const PF_THEME_KEY = 'portafolio-theme'

const PortafolioThemeContext = createContext({
    theme: 'dark',
    setTheme: () => {},
    toggleTheme: () => {},
})

function readStoredTheme() {
    if (typeof window === 'undefined') return 'dark'
    try {
        const stored = window.localStorage.getItem(PF_THEME_KEY)
        if (stored === 'light' || stored === 'dark') return stored
    } catch {
        // ignore
    }
    return 'dark'
}

function applyThemeAttr(theme) {
    const root = document.querySelector('[data-portafolio-root]')
    if (root) root.setAttribute('data-theme', theme)
}

export function PortafolioThemeProvider({ children }) {
    const [theme, setThemeState] = useState('dark')
    const [ready, setReady] = useState(false)

    useEffect(() => {
        const initial = readStoredTheme()
        setThemeState(initial)
        applyThemeAttr(initial)
        setReady(true)
    }, [])

    const setTheme = useCallback(next => {
        const value = next === 'light' ? 'light' : 'dark'
        setThemeState(value)
        applyThemeAttr(value)
        try {
            window.localStorage.setItem(PF_THEME_KEY, value)
        } catch {
            // ignore
        }
    }, [])

    const toggleTheme = useCallback(() => {
        setTheme(theme === 'dark' ? 'light' : 'dark')
    }, [setTheme, theme])

    const value = useMemo(
        () => ({ theme, setTheme, toggleTheme, ready }),
        [theme, setTheme, toggleTheme, ready],
    )

    return (
        <PortafolioThemeContext.Provider value={value}>
            {children}
        </PortafolioThemeContext.Provider>
    )
}

export function usePortafolioTheme() {
    return useContext(PortafolioThemeContext)
}
