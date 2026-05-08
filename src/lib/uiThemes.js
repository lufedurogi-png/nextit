import { applyThemeToDocument, persistTheme, broadcastThemeChange } from '@/lib/appTheme'

/** @typedef {{ id: number, name: string, hint?: string, isDark: boolean, swatch: [string, string], vars: Record<string, string> }} UiThemePreset */

/** Variables que se inyectan en <html> (pisan :root / .theme-dark de global.css). */
export const UI_THEME_VAR_KEYS = [
    '--app-primary',
    '--app-primary-2',
    '--app-accent',
    '--app-accent-2',
    '--app-bg',
    '--app-card',
    '--app-text',
    '--app-subtle',
]

/** Quita variables de tema UI inyectadas en `<html>` (vuelve a :root del CSS). */
export function clearUiThemeInlineVars() {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    UI_THEME_VAR_KEYS.forEach((k) => root.style.removeProperty(k))
    root.removeAttribute('data-ui-theme')
}

/**
 * 10 modos: 1 claro marca, 2 oscuro petróleo + morado, 8 combinaciones con nombre propio.
 * @type {UiThemePreset[]}
 */
export const UI_THEMES = [
    {
        id: 1,
        name: 'Claro',
        hint: 'Por defecto',
        isDark: false,
        swatch: ['#ffffff', '#6366f1'],
        vars: {
            '--app-primary': '#1e1b4b',
            '--app-primary-2': '#4338ca',
            '--app-accent': '#6366f1',
            '--app-accent-2': '#a855f7',
            '--app-bg': '#f5f5ff',
            '--app-card': '#ffffff',
            '--app-text': '#111827',
            '--app-subtle': '#6b7280',
        },
    },
    {
        id: 2,
        name: 'Oscuro',
        hint: 'Petróleo y violeta',
        isDark: true,
        swatch: ['#0f1724', '#7c3aed'],
        vars: {
            '--app-primary': '#334155',
            '--app-primary-2': '#475569',
            '--app-accent': '#8b5cf6',
            '--app-accent-2': '#a78bfa',
            '--app-bg': '#1a1f2e',
            '--app-card': '#252d3f',
            '--app-text': '#e8eef8',
            '--app-subtle': '#9fb0c8',
        },
    },
    {
        id: 3,
        name: 'Horizonte',
        hint: 'Tono fresco',
        isDark: false,
        swatch: ['#e8f4fc', '#1d4ed8'],
        vars: {
            '--app-primary': '#0c4a6e',
            '--app-primary-2': '#0369a1',
            '--app-accent': '#2563eb',
            '--app-accent-2': '#38bdf8',
            '--app-bg': '#e8f4fc',
            '--app-card': '#f8fafc',
            '--app-text': '#0f172a',
            '--app-subtle': '#475569',
        },
    },
    {
        id: 4,
        name: 'Encanto',
        hint: 'Rosa suave',
        isDark: false,
        swatch: ['#fff5f7', '#db2777'],
        vars: {
            '--app-primary': '#831843',
            '--app-primary-2': '#9d174d',
            '--app-accent': '#db2777',
            '--app-accent-2': '#f472b6',
            '--app-bg': '#fff5f7',
            '--app-card': '#ffffff',
            '--app-text': '#1f2937',
            '--app-subtle': '#9d174d',
        },
    },
    {
        id: 5,
        name: 'Selva nocturna',
        hint: 'Oscuro verde',
        isDark: true,
        swatch: ['#0f1f1a', '#34d399'],
        vars: {
            '--app-primary': '#14532d',
            '--app-primary-2': '#166534',
            '--app-accent': '#34d399',
            '--app-accent-2': '#6ee7b7',
            '--app-bg': '#0f1f1a',
            '--app-card': '#162e24',
            '--app-text': '#ecfdf5',
            '--app-subtle': '#86efac',
        },
    },
    {
        id: 6,
        name: 'Bruma',
        hint: 'Neutro unisex',
        isDark: false,
        swatch: ['#eef2ff', '#4f46e5'],
        vars: {
            '--app-primary': '#312e81',
            '--app-primary-2': '#4338ca',
            '--app-accent': '#4f46e5',
            '--app-accent-2': '#818cf8',
            '--app-bg': '#eef2ff',
            '--app-card': '#ffffff',
            '--app-text': '#1e1b4b',
            '--app-subtle': '#64748b',
        },
    },
    {
        id: 7,
        name: 'Acero rojo',
        hint: 'Oscuro intenso',
        isDark: true,
        swatch: ['#171717', '#ef4444'],
        vars: {
            '--app-primary': '#404040',
            '--app-primary-2': '#525252',
            '--app-accent': '#ef4444',
            '--app-accent-2': '#f87171',
            '--app-bg': '#171717',
            '--app-card': '#262626',
            '--app-text': '#fafafa',
            '--app-subtle': '#a3a3a3',
        },
    },
    {
        id: 8,
        name: 'Primavera',
        hint: 'Crema y violeta',
        isDark: false,
        swatch: ['#fffbeb', '#9333ea'],
        vars: {
            '--app-primary': '#581c87',
            '--app-primary-2': '#6b21a8',
            '--app-accent': '#9333ea',
            '--app-accent-2': '#c084fc',
            '--app-bg': '#fffbeb',
            '--app-card': '#ffffff',
            '--app-text': '#1c1917',
            '--app-subtle': '#78716c',
        },
    },
    {
        id: 9,
        name: 'Costa azul',
        hint: 'Claro relajado',
        isDark: false,
        swatch: ['#f0f9ff', '#0d9488'],
        vars: {
            '--app-primary': '#134e4a',
            '--app-primary-2': '#0f766e',
            '--app-accent': '#0d9488',
            '--app-accent-2': '#2dd4bf',
            '--app-bg': '#f0f9ff',
            '--app-card': '#ffffff',
            '--app-text': '#0f172a',
            '--app-subtle': '#0f766e',
        },
    },
    {
        id: 10,
        name: 'Medianoche',
        hint: 'Oscuro elegante',
        isDark: true,
        swatch: ['#1e1b2e', '#eab308'],
        vars: {
            '--app-primary': '#4c1d95',
            '--app-primary-2': '#5b21b6',
            '--app-accent': '#eab308',
            '--app-accent-2': '#facc15',
            '--app-bg': '#1e1b2e',
            '--app-card': '#2a2540',
            '--app-text': '#faf5ff',
            '--app-subtle': '#c4b5fd',
        },
    },
]

export function getUiThemeById(themeId) {
    const n = Number(themeId)
    return UI_THEMES.find((t) => t.id === n) || UI_THEMES[0]
}

/**
 * Aplica modo (clases dark/theme-dark) y variables CSS en <html>.
 * @param {number} themeId 1–10
 */
export function applyUiTheme(themeId) {
    if (typeof document === 'undefined') return
    const preset = getUiThemeById(themeId)
    const root = document.documentElement

    applyThemeToDocument(!!preset.isDark)

    UI_THEME_VAR_KEYS.forEach((k) => root.style.removeProperty(k))
    Object.entries(preset.vars).forEach(([k, v]) => {
        root.style.setProperty(k, v)
    })
    root.setAttribute('data-ui-theme', String(preset.id))
}

/**
 * Persiste en localStorage el booleano legacy y emite evento (tabs / compat).
 * @param {number} themeId
 */
export function persistUiThemeSideEffects(themeId) {
    const preset = getUiThemeById(themeId)
    persistTheme(!!preset.isDark)
    broadcastThemeChange(!!preset.isDark)
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('uiThemeChange', { detail: themeId }))
    }
}

export function normalizeUiThemeId(value) {
    const n = parseInt(String(value ?? '1'), 10)
    if (Number.isNaN(n) || n < 1 || n > 10) return 1
    return n
}
