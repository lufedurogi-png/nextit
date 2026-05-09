'use client'

import { useEffect, useLayoutEffect, useState } from 'react'
import { getStoredAdminDarkMode } from '@/lib/appTheme'

/**
 * Sincroniza con el interruptor del layout admin (`coleccionador_admin_dark_mode` + evento `darkModeChange`).
 * Debe partir en `true` como el `AdminLayout` y leer `localStorage` tras montar: en SSR `getStoredAdminDarkMode()`
 * devuelve `true` (sin `window`); si el inicializador leyera storage solo en cliente, la hidratación y el layout
 * quedaban en desfase (sidebar claro vs tarjetas oscuras al refrescar en modo claro).
 */
export function useAdminDarkMode() {
    const [darkMode, setDarkMode] = useState(true)

    useLayoutEffect(() => {
        setDarkMode(getStoredAdminDarkMode())
    }, [])

    useEffect(() => {
        const onChange = (e) => setDarkMode(!!e.detail)
        window.addEventListener('darkModeChange', onChange)
        return () => window.removeEventListener('darkModeChange', onChange)
    }, [])

    return darkMode
}
