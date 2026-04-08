/**
 * Estilos compartidos del panel admin (verde esmeralda sólido + grises, sin brillos/neón).
 */

const selectScheme = (darkMode) => (darkMode ? 'admin-native-select-dark' : 'admin-native-select-light')

export function adminMainCardClass(darkMode) {
    return darkMode
        ? 'rounded-2xl border border-gray-700 bg-gray-800/90 p-6 shadow-lg shadow-black/30'
        : 'rounded-2xl border border-gray-200 bg-white p-6 shadow-md shadow-gray-900/5'
}

export function adminTableShellClass(darkMode) {
    return darkMode
        ? 'overflow-x-auto rounded-xl border border-gray-700 bg-gray-900/50'
        : 'overflow-x-auto rounded-xl border border-gray-200 bg-gray-50/80'
}

export function adminTableHeadRowClass(darkMode) {
    return darkMode
        ? 'border-b border-gray-700 bg-gray-800 align-top'
        : 'border-b border-gray-200 bg-gray-100 align-top'
}

export function adminFilterSelectClass(darkMode, active, extra = '') {
    const base = `mt-1 w-full min-w-0 px-2.5 py-1.5 rounded-lg border text-xs transition-colors focus:outline-none focus:!ring-0 focus:!border-emerald-600 ${selectScheme(darkMode)}`
    const activeCls = active
        ? darkMode
            ? 'bg-gray-700 !border-emerald-600 text-gray-100'
            : 'bg-emerald-50 !border-emerald-400 text-gray-900'
        : darkMode
            ? 'bg-gray-800 border-gray-600 text-gray-100'
            : 'bg-white border-gray-300 text-gray-900'
    return `${base} ${activeCls} ${extra}`
}

export function adminFilterInputClass(darkMode, active, extra = '') {
    const base =
        'mt-1 w-full min-w-0 px-2.5 py-1.5 rounded-lg border text-xs transition-colors focus:outline-none focus:!ring-0 focus:!border-emerald-600'
    const activeCls = active
        ? darkMode
            ? 'bg-gray-700 !border-emerald-600 text-gray-100 placeholder:text-gray-400'
            : 'bg-emerald-50 !border-emerald-400 text-gray-900 placeholder-gray-600'
        : darkMode
            ? 'bg-gray-800 border-gray-600 text-gray-100 placeholder:text-gray-400'
            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
    return `${base} ${activeCls} ${extra}`
}

/** Igual que filtros de texto pero con icono de calendario claro en modo oscuro (clase global `.admin-date-input-dark` en global.css). */
export function adminFilterDateInputClass(darkMode, active, extra = '') {
    const base = adminFilterInputClass(darkMode, active, extra)
    if (!darkMode) return base
    return `${base} admin-date-input-dark`
}

export function adminColumnTitleClass(darkMode) {
    return darkMode
        ? 'inline-flex items-center rounded-lg px-2.5 py-1.5 mb-2 text-[11px] font-bold uppercase tracking-wider border border-emerald-700/80 bg-gray-800 text-emerald-200'
        : 'inline-flex items-center rounded-lg px-2.5 py-1.5 mb-2 text-[11px] font-bold uppercase tracking-wider border border-emerald-200 bg-emerald-50 text-emerald-900'
}

export function adminColumnTitleDotClass(darkMode) {
    return `mr-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${darkMode ? 'bg-emerald-500' : 'bg-emerald-600'}`
}

export function adminDateFieldBoxClass(darkMode, active) {
    if (active) {
        return darkMode
            ? 'rounded-lg border border-emerald-700 bg-gray-800 p-2'
            : 'rounded-lg border border-emerald-200 bg-emerald-50 p-2'
    }
    return darkMode
        ? 'rounded-lg border border-gray-600 bg-gray-800/80 p-2'
        : 'rounded-lg border border-gray-200 bg-white p-2'
}

export function adminDateLabelClass(darkMode) {
    return `mb-1 block text-[10px] font-semibold uppercase tracking-wide ${darkMode ? 'text-emerald-400' : 'text-emerald-800'}`
}

export function adminPageIconWrapClass(darkMode) {
    return darkMode
        ? 'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emerald-800 bg-gray-800 text-emerald-400'
        : 'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700'
}

export function adminPageTitleClass(darkMode) {
    return darkMode ? 'text-2xl font-bold text-gray-100' : 'text-2xl font-bold text-gray-900'
}

export function adminPageSubtitleClass(darkMode) {
    return darkMode ? 'text-sm mt-0.5 text-gray-400' : 'text-sm mt-0.5 text-gray-600'
}

/** Barra bajo el título de página (verde sólido) */
export function adminTitleAccentBarClass(darkMode) {
    return `mt-2 h-1 w-14 rounded-full ${darkMode ? 'bg-emerald-500' : 'bg-emerald-600'}`
}

/** Clases para el selector «Mostrar» (misma legibilidad que filtros de tabla). */
export function adminToolbarSelectClass(darkMode) {
    return `px-3 py-2 rounded-lg border text-sm font-medium transition-colors focus:outline-none focus:ring-0 focus:!border-emerald-600 ${selectScheme(darkMode)} ${
        darkMode
            ? 'bg-gray-800 border-gray-600 text-gray-100 hover:border-gray-500'
            : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400'
    }`
}
