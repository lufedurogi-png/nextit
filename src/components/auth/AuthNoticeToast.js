'use client'

/**
 * Aviso tipo “log” / toast para mensajes breves (ej. debe registrarse primero).
 */
export default function AuthNoticeToast({ open, message, darkMode, onClose }) {
    if (!open) return null

    return (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[200] flex justify-center px-4">
            <div
                className={`pointer-events-auto flex max-w-md items-start gap-3 rounded-2xl border-2 px-4 py-3 shadow-2xl backdrop-blur-sm ${
                    darkMode ? 'border-gray-600 bg-gray-900/95 text-gray-100' : 'border-gray-200 bg-white/95 text-gray-900'
                }`}
                role="alertdialog"
                aria-live="polite"
                aria-labelledby="auth-notice-title"
            >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-lg" aria-hidden>
                    ℹ️
                </div>
                <div className="min-w-0 flex-1">
                    <p id="auth-notice-title" className="text-sm font-semibold leading-snug">
                        {message}
                    </p>
                    <button
                        type="button"
                        onClick={onClose}
                        className={`mt-2 text-xs font-bold underline ${darkMode ? 'text-blue-300' : 'text-[#2563eb]'}`}
                    >
                        Entendido
                    </button>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className={`shrink-0 rounded-lg p-1 text-lg leading-none opacity-70 hover:opacity-100 ${
                        darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'
                    }`}
                    aria-label="Cerrar"
                >
                    ×
                </button>
            </div>
        </div>
    )
}
