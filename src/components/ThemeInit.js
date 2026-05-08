'use client'

import { useEffect } from 'react'
import { syncDocumentThemeFromAuthStorage } from '@/lib/themeDocument'
import { applyUiTheme } from '@/lib/uiThemes'

/** Aplica tema del cliente (BD → localStorage), modo admin en caché, o `darkMode` de invitado. */
export default function ThemeInit() {
    useEffect(() => {
        syncDocumentThemeFromAuthStorage()
    }, [])

    useEffect(() => {
        const onStorage = (e) => {
            if (e.key !== 'auth_user') return
            syncDocumentThemeFromAuthStorage()
        }
        const onUiTheme = (e) => {
            if (typeof e.detail !== 'number') return
            try {
                const raw = localStorage.getItem('auth_user')
                if (raw) {
                    const u = JSON.parse(raw)
                    if (u?.role === 'admin') return
                }
            } catch {
                // ignore
            }
            applyUiTheme(e.detail)
        }
        window.addEventListener('storage', onStorage)
        window.addEventListener('uiThemeChange', onUiTheme)
        return () => {
            window.removeEventListener('storage', onStorage)
            window.removeEventListener('uiThemeChange', onUiTheme)
        }
    }, [])

    return null
}
