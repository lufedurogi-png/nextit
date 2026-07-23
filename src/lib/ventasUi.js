/**
 * Estilos compartidos del panel ventas (naranja sólido + grises, sin brillos/neón).
 */

const selectScheme = (darkMode) => (darkMode ? 'ventas-native-select-dark' : 'ventas-native-select-light')

export function ventasMainCardClass(darkMode) {
    return darkMode
        ? 'rounded-2xl border border-gray-700 bg-tienda-elevated/90 p-6 shadow-lg shadow-black/30'
        : 'rounded-2xl border border-gray-200 bg-white p-6 shadow-md shadow-gray-900/5'
}

export function ventasTableShellClass(darkMode) {
    return darkMode
        ? 'overflow-x-auto rounded-xl border border-gray-700 bg-tienda-canvas/50'
        : 'overflow-x-auto rounded-xl border border-gray-200 bg-gray-50/80'
}

export function ventasTableHeadRowClass(darkMode) {
    return darkMode
        ? 'border-b border-gray-700 bg-tienda-elevated align-top'
        : 'border-b border-gray-200 bg-gray-100 align-top'
}

export function ventasFilterSelectClass(darkMode, active, extra = '') {
    const base = `mt-1 w-full min-w-0 px-2.5 py-1.5 rounded-lg border text-xs transition-colors focus:outline-none focus:!ring-0 focus:!border-orange-600 ${selectScheme(darkMode)}`
    const activeCls = active
        ? darkMode
            ? 'bg-gray-700 !border-orange-600 text-gray-100'
            : 'bg-orange-50 !border-orange-400 text-gray-900'
        : darkMode
            ? 'bg-tienda-elevated border-gray-600 text-gray-100'
            : 'bg-white border-gray-300 text-gray-900'
    return `${base} ${activeCls} ${extra}`
}

export function ventasFilterInputClass(darkMode, active, extra = '') {
    const base =
        'mt-1 w-full min-w-0 px-2.5 py-1.5 rounded-lg border text-xs transition-colors focus:outline-none focus:!ring-0 focus:!border-orange-600'
    const activeCls = active
        ? darkMode
            ? 'bg-gray-700 !border-orange-600 text-gray-100 placeholder:text-gray-400'
            : 'bg-orange-50 !border-orange-400 text-gray-900 placeholder-gray-600'
        : darkMode
            ? 'bg-tienda-elevated border-gray-600 text-gray-100 placeholder:text-gray-400'
            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
    return `${base} ${activeCls} ${extra}`
}

/** Igual que filtros de texto pero con icono de calendario claro en modo oscuro (clase global `.ventas-date-input-dark` en global.css). */
export function ventasFilterDateInputClass(darkMode, active, extra = '') {
    const base = ventasFilterInputClass(darkMode, active, extra)
    if (!darkMode) return base
    return `${base} ventas-date-input-dark`
}

export function ventasColumnTitleClass(darkMode) {
    return darkMode
        ? 'inline-flex items-center rounded-lg px-2.5 py-1.5 mb-2 text-[11px] font-bold uppercase tracking-wider border border-orange-700/80 bg-tienda-elevated text-orange-200'
        : 'inline-flex items-center rounded-lg px-2.5 py-1.5 mb-2 text-[11px] font-bold uppercase tracking-wider border border-orange-200 bg-orange-50 text-orange-900'
}

export function ventasColumnTitleDotClass(darkMode) {
    return `mr-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${darkMode ? 'bg-orange-500' : 'bg-orange-600'}`
}

export function ventasDateFieldBoxClass(darkMode, active) {
    if (active) {
        return darkMode
            ? 'rounded-lg border border-orange-700 bg-tienda-elevated p-2'
            : 'rounded-lg border border-orange-200 bg-orange-50 p-2'
    }
    return darkMode
        ? 'rounded-lg border border-gray-600 bg-tienda-elevated/80 p-2'
        : 'rounded-lg border border-gray-200 bg-white p-2'
}

export function ventasDateLabelClass(darkMode) {
    return `mb-1 block text-[10px] font-semibold uppercase tracking-wide ${darkMode ? 'text-orange-400' : 'text-orange-800'}`
}

export function ventasPageIconWrapClass(darkMode) {
    return darkMode
        ? 'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-orange-800 bg-tienda-elevated text-orange-400'
        : 'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-orange-200 bg-orange-50 text-orange-700'
}

export function ventasPageTitleClass(darkMode) {
    return darkMode ? 'text-2xl font-bold text-gray-100' : 'text-2xl font-bold text-gray-900'
}

export function ventasPageSubtitleClass(darkMode) {
    return darkMode ? 'text-sm mt-0.5 text-gray-400' : 'text-sm mt-0.5 text-gray-600'
}

/** Barra bajo el título de página (naranja sólido) */
export function ventasTitleAccentBarClass(darkMode) {
    return `mt-2 h-1 w-14 rounded-full ${darkMode ? 'bg-orange-500' : 'bg-orange-600'}`
}

/** Clases para el selector «Mostrar» (misma legibilidad que filtros de tabla). */
export function ventasToolbarSelectClass(darkMode) {
    return `px-3 py-2 rounded-lg border text-sm font-medium transition-colors focus:outline-none focus:ring-0 focus:!border-orange-600 ${selectScheme(darkMode)} ${
        darkMode
            ? 'bg-tienda-elevated border-gray-600 text-gray-100 hover:border-gray-500'
            : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400'
    }`
}
