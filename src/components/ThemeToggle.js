'use client'

function IconoModo({ oscuro }) {
    if (oscuro) {
        return (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
                />
            </svg>
        )
    }
    return (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <circle cx="12" cy="12" r="4" strokeLinecap="round" />
            <path
                strokeLinecap="round"
                d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
            />
        </svg>
    )
}

const PALETTES = {
    violet: {
        iconDark: 'border-violet-400/35 bg-violet-950/50 text-violet-200',
        iconLight: 'border-violet-300/80 bg-violet-50 text-violet-700',
        trackOn: 'bg-violet-600 justify-end',
        trackOff: 'bg-violet-300/90 justify-start',
        labelDark: 'text-violet-200',
        labelLight: 'text-violet-800',
        focusRing: 'focus-visible:ring-violet-500/45',
    },
    brand: {
        iconDark: 'border-brand/35 bg-brand/10 text-orange-200',
        iconLight: 'border-brand/50 bg-brand-soft text-brand',
        trackOn: 'bg-brand justify-end',
        trackOff: 'bg-orange-300/90 justify-start',
        labelDark: 'text-orange-200',
        labelLight: 'text-brand',
        focusRing: 'focus-visible:ring-brand/45',
    },
}

/**
 * Toggle modo oscuro: icono (sol / luna) + switch + etiqueta.
 * `variant="brand"` en ventas (naranja tienda); por defecto violeta (admin).
 */
export default function ThemeToggle({ dark, onToggle, variant = 'violet' }) {
    const p = PALETTES[variant] || PALETTES.violet

    return (
        <div className="flex items-center gap-3">
            <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors ${
                    dark ? p.iconDark : p.iconLight
                }`}
                aria-hidden
            >
                <IconoModo oscuro={dark} />
            </span>
            <button
                type="button"
                role="switch"
                aria-label={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                aria-checked={dark}
                onClick={onToggle}
                className={`flex items-center gap-3 rounded-full focus:outline-none focus-visible:ring-2 ${p.focusRing} focus-visible:ring-offset-2 focus-visible:ring-offset-transparent`}
            >
                <span
                    className={`flex h-5 w-10 items-center rounded-full px-0.5 transition-colors ${
                        dark ? p.trackOn : p.trackOff
                    }`}
                >
                    <span className="block h-4 w-4 shrink-0 rounded-full bg-white shadow-sm" />
                </span>
                <span className={`text-sm font-medium ${dark ? p.labelDark : p.labelLight}`}>
                    {dark ? 'Oscuro' : 'Claro'}
                </span>
            </button>
        </div>
    )
}
