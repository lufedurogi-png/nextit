'use client'

import { useCallback, useEffect, useState } from 'react'
import axios from '@/lib/axios'
import { applyUiTheme, normalizeUiThemeId, persistUiThemeSideEffects } from '@/lib/uiThemes'
import { applyThemeToDocument, getStoredDarkMode } from '@/lib/appTheme'

/**
 * Tema UI guardado en perfil (localStorage + API). Reutilizable en Perfil y barra global.
 * @param {(data: any, shouldRevalidate?: boolean) => Promise<any>} mutateUser — mutate de useAuth
 * @param {any} [user] — usuario de useAuth (sincroniza ui_theme al cargar)
 */
export function useUiThemePreference(mutateUser, user) {
    const [uiTheme, setUiTheme] = useState(1)
    const [savingThemeId, setSavingThemeId] = useState(null)

    useEffect(() => {
        if (typeof window === 'undefined') return
        try {
            const raw = localStorage.getItem('auth_user')
            if (raw) {
                const u = JSON.parse(raw)
                if (u?.ui_theme != null) {
                    const id = normalizeUiThemeId(u.ui_theme)
                    setUiTheme(id)
                    applyUiTheme(id)
                    persistUiThemeSideEffects(id)
                    return
                }
            }
        } catch {
            // ignorar
        }
        applyThemeToDocument(getStoredDarkMode())
    }, [])

    useEffect(() => {
        const syncUiThemeFromStorage = () => {
            try {
                const raw = localStorage.getItem('auth_user')
                if (!raw) return
                const u = JSON.parse(raw)
                if (u?.ui_theme == null) return
                setUiTheme(normalizeUiThemeId(u.ui_theme))
            } catch {
                // ignorar
            }
        }
        const onStorage = (ev) => {
            if (ev.key === 'auth_user') syncUiThemeFromStorage()
        }
        window.addEventListener('uiThemeChange', syncUiThemeFromStorage)
        window.addEventListener('storage', onStorage)
        return () => {
            window.removeEventListener('uiThemeChange', syncUiThemeFromStorage)
            window.removeEventListener('storage', onStorage)
        }
    }, [])

    const persistSessionUser = useCallback(
        async (nextUser) => {
            if (nextUser) {
                localStorage.setItem('auth_user', JSON.stringify(nextUser))
                if (mutateUser) await mutateUser(nextUser, false)
            }
        },
        [mutateUser]
    )

    const selectUiTheme = useCallback(
        async (id) => {
            const next = normalizeUiThemeId(id)
            if (next === uiTheme) return
            const prev = uiTheme
            setUiTheme(next)
            applyUiTheme(next)
            persistUiThemeSideEffects(next)
            setSavingThemeId(next)
            try {
                const { data } = await axios.patch('/profile', { ui_theme: next })
                await persistSessionUser(data)
                if (typeof window !== 'undefined') window.dispatchEvent(new Event('uiThemeChange'))
            } catch {
                setUiTheme(prev)
                applyUiTheme(prev)
                persistUiThemeSideEffects(prev)
            } finally {
                setSavingThemeId(null)
            }
        },
        [uiTheme, persistSessionUser]
    )

    useEffect(() => {
        if (user?.ui_theme == null) return
        const id = normalizeUiThemeId(user.ui_theme)
        setUiTheme(id)
        applyUiTheme(id)
        persistUiThemeSideEffects(id)
    }, [user?.ui_theme])

    return { uiTheme, savingThemeId, selectUiTheme }
}
