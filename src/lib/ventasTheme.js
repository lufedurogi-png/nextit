/**
 * Tokens visuales del CRM ventas — alineados con la tienda (brand naranja).
 * Layout escritorio: usar prefijo Tailwind `md:` (768px), igual que `(admin)`, no `lg:` (1024px).
 */
export const VENTAS_BRAND_FROM = '#FF8000'
export const VENTAS_BRAND_TO = '#e67300'

export const ventasBrandGradient = `linear-gradient(90deg, ${VENTAS_BRAND_FROM}, ${VENTAS_BRAND_TO})`
export const ventasBrandGradient135 = `linear-gradient(135deg, ${VENTAS_BRAND_FROM} 0%, ${VENTAS_BRAND_TO} 100%)`

export const ventasBrandStyle = { background: ventasBrandGradient }

export const ventasBrandBtn =
    'rounded-xl px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-50'

export const ventasBrandBtnLg =
    'rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-brand/40 disabled:opacity-50 disabled:cursor-not-allowed'

/** Fondos oscuros (misma familia que `tienda` en tailwind.config.js). */
export const VENTAS_DARK_CANVAS = '#1c1c1c'
export const VENTAS_DARK_ELEVATED = '#262626'
export const VENTAS_DARK_PANEL = '#202020'
