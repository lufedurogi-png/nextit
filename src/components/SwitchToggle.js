'use client'

/**
 * Interruptor estilo “pill” (similar a iOS) para estados on/off.
 * Accesible: role="switch", aria-checked, teclado (Enter/Espacio).
 */
export default function SwitchToggle({
    checked,
    onChange,
    disabled = false,
    darkMode = false,
    id,
    'aria-label': ariaLabel = 'Alternar',
}) {
    return (
        <button
            id={id}
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={ariaLabel}
            disabled={disabled}
            onClick={() => !disabled && onChange(!checked)}
            onKeyDown={(e) => {
                if (disabled) return
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onChange(!checked)
                }
            }}
            className={`
                relative inline-flex h-7 w-[2.75rem] shrink-0 cursor-pointer rounded-full
                transition-colors duration-200 ease-out
                focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
                ${darkMode ? 'focus-visible:ring-sky-400 focus-visible:ring-offset-gray-900' : 'focus-visible:ring-sky-500 focus-visible:ring-offset-white'}
                ${disabled ? 'cursor-not-allowed opacity-50' : ''}
                ${
                    checked
                        ? 'bg-emerald-500'
                        : darkMode
                          ? 'bg-gray-600'
                          : 'bg-gray-300'
                }
            `}
        >
            <span
                className={`
                    pointer-events-none absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow
                    transition-transform duration-200 ease-out
                    ${checked ? 'translate-x-[1.375rem]' : 'translate-x-0'}
                `}
                aria-hidden
            />
        </button>
    )
}
