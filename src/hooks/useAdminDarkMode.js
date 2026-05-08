'use client'

import { useEffect, useState } from 'react'
import { getStoredAdminDarkMode } from '@/lib/appTheme'

/**
 * Sincroniza con el interruptor del layout admin (`coleccionador_admin_dark_mode` + evento `darkModeChange`).
 */
export function useAdminDarkMode() {
    const [darkMode, setDarkMode] = useState(() => getStoredAdminDarkMode())

    useEffect(() => {
        setDarkMode(getStoredAdminDarkMode())
        const onChange = (e) => setDarkMode(!!e.detail)
        window.addEventListener('darkModeChange', onChange)
        return () => window.removeEventListener('darkModeChange', onChange)
    }, [])

    return darkMode
}
