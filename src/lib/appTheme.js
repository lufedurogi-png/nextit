/**
 * Tema global: localStorage `darkMode` (JSON boolean).
 * Primera visita (sin clave): modo claro.
 * Sincroniza clases `dark` (Tailwind) y `theme-dark` (coleccionador) en <html>.
 */
export const THEME_STORAGE_KEY = 'darkMode'
export const THEME_LEGACY_KEY = 'theme_mode'

/** Panel admin: solo caché del navegador (independiente del tema UI en BD del cliente). */
export const ADMIN_THEME_STORAGE_KEY = 'coleccionador_admin_dark_mode'

export function getStoredDarkMode() {
    if (typeof window === 'undefined') return false
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    if (raw === null) return false
    try {
        return JSON.parse(raw) === true
    } catch {
        return false
    }
}

export function applyThemeToDocument(isDark) {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    if (isDark) {
        root.classList.add('dark')
        root.classList.add('theme-dark')
    } else {
        root.classList.remove('dark')
        root.classList.remove('theme-dark')
    }
}

export function persistTheme(isDark) {
    if (typeof window === 'undefined') return
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(isDark))
    localStorage.setItem(THEME_LEGACY_KEY, isDark ? 'dark' : 'light')
}

export function broadcastThemeChange(isDark) {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new CustomEvent('darkModeChange', { detail: isDark }))
}

/**
 * Modo oscuro/claro guardado para rutas admin (no escribe el mismo booleano que el cliente en `darkMode`).
 * Si existe clave legacy `darkMode` y aún no hay clave admin, se usa una vez para migrar.
 */
export function getStoredAdminDarkMode() {
    if (typeof window === 'undefined') return true
    const primary = localStorage.getItem(ADMIN_THEME_STORAGE_KEY)
    if (primary !== null) {
        try {
            return JSON.parse(primary) === true
        } catch {
            return true
        }
    }
    const legacy = localStorage.getItem(THEME_STORAGE_KEY)
    if (legacy !== null) {
        try {
            return JSON.parse(legacy) === true
        } catch {
            return true
        }
    }
    return true
}

export function persistAdminTheme(isDark) {
    if (typeof window === 'undefined') return
    localStorage.setItem(ADMIN_THEME_STORAGE_KEY, JSON.stringify(isDark))
    broadcastThemeChange(isDark)
}
