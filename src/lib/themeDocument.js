import { applyThemeToDocument, getStoredDarkMode, getStoredAdminDarkMode } from '@/lib/appTheme'
import { applyUiTheme, clearUiThemeInlineVars, normalizeUiThemeId } from '@/lib/uiThemes'

/**
 * Tema UI del cliente desde `auth_user` (BD reflejada en localStorage). `null` si es admin o no hay tema.
 */
export function readClientUiThemeFromAuthStorage() {
    if (typeof window === 'undefined') return null
    try {
        const raw = localStorage.getItem('auth_user')
        if (!raw) return null
        const u = JSON.parse(raw)
        if (u?.role === 'admin') return null
        if (u?.ui_theme == null) return null
        return normalizeUiThemeId(u.ui_theme)
    } catch {
        return null
    }
}

/** Panel admin: quita variables del tema cliente y aplica solo claro/oscuro Tailwind en `<html>`. */
export function applyAdminDocumentTheme(isDark) {
    clearUiThemeInlineVars()
    applyThemeToDocument(isDark)
}

/** Al salir del layout admin: restaurar tema del cliente o el booleano `darkMode` de invitado. */
export function restoreClientDocumentTheme() {
    const themeId = readClientUiThemeFromAuthStorage()
    if (themeId != null) {
        applyUiTheme(themeId)
        return
    }
    clearUiThemeInlineVars()
    applyThemeToDocument(getStoredDarkMode())
}

/** Tras login/logout en otra pestaña: re-sincronizar `<html>`. */
export function syncDocumentThemeFromAuthStorage() {
    try {
        const raw = localStorage.getItem('auth_user')
        if (!raw) {
            clearUiThemeInlineVars()
            applyThemeToDocument(getStoredDarkMode())
            return
        }
        const u = JSON.parse(raw)
        if (u?.role === 'admin') {
            applyAdminDocumentTheme(getStoredAdminDarkMode())
            return
        }
        if (u?.ui_theme != null) {
            applyUiTheme(normalizeUiThemeId(u.ui_theme))
            return
        }
    } catch {
        // ignore
    }
    clearUiThemeInlineVars()
    applyThemeToDocument(getStoredDarkMode())
}
