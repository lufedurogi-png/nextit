'use client'

import { useEffect } from 'react'
import { applyThemeToDocument, getStoredDarkMode } from '@/lib/appTheme'

/** Aplica el tema guardado al cargar cualquier ruta (incl. /dashboard sin layout auth). */
export default function ThemeInit() {
    useEffect(() => {
        applyThemeToDocument(getStoredDarkMode())
    }, [])
    return null
}
