/**
 * Tema global: localStorage `darkMode` (JSON boolean).
 * Primera visita (sin clave): modo claro.
 * Sincroniza clases `dark` (Tailwind) y `theme-dark` (coleccionador) en <html>.
 */
export const THEME_STORAGE_KEY = 'darkMode'
export const THEME_LEGACY_KEY = 'theme_mode'

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
