'use client'

/** Botón accesible para alternar visibilidad de contraseña (sin assets externos). */
export default function PasswordToggleButton({
    visible,
    onToggle,
    className = '',
    iconClass = 'w-[22px] h-[22px]',
    labelShow = 'Ver contraseña',
    labelHide = 'Ocultar contraseña',
}) {
    return (
        <button
            type="button"
            onClick={onToggle}
            className={`p-1 rounded hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${className}`}
            aria-label={visible ? labelHide : labelShow}
        >
            {visible ? (
                <svg className={`${iconClass} text-gray-600 dark:text-gray-300`} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
                    <path strokeWidth="2" strokeLinecap="round" d="M3 3l18 18M10.58 10.58a2 2 0 002.83 2.83M9.88 5.09A10.94 10.94 0 0112 5c7 0 10 7 10 7a13.16 13.16 0 01-1.67 2.68M6.61 6.61A13.53 13.53 0 003 12s3 7 10 7a9.74 9.74 0 004.39-1" />
                </svg>
            ) : (
                <svg className={`${iconClass} text-gray-600 dark:text-gray-300`} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
                    <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                    <circle cx="12" cy="12" r="3" strokeWidth="2" />
                </svg>
            )}
        </button>
    )
}
