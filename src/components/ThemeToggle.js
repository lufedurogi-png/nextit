'use client'

import Image from 'next/image'

/**
 * Toggle modo claro/oscuro sincronizado con `darkMode` en localStorage (evento darkModeChange).
 */
export default function ThemeToggle({ dark, onToggle }) {
    return (
        <div className="flex items-center gap-3">
            <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10"
                aria-hidden
            >
                <Image src="/Imagenes/icon_modo.webp" alt="" width={20} height={20} className="h-5 w-5 object-contain" />
            </span>
            <button
                type="button"
                role="switch"
                aria-label={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                aria-checked={dark}
                onClick={onToggle}
                className="flex items-center gap-3 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
            >
                <span
                    className={`flex h-5 w-10 items-center rounded-full transition-colors ${
                        dark ? 'bg-blue-600' : 'bg-gray-500/40'
                    }`}
                >
                    <span
                        className={`block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                            dark ? 'translate-x-6 ml-0.5' : 'translate-x-0.5'
                        }`}
                    />
                </span>
                <span className={`text-sm font-medium ${dark ? 'text-blue-300' : 'text-slate-200'}`}>
                    {dark ? 'Oscuro' : 'Claro'}
                </span>
            </button>
        </div>
    )
}
