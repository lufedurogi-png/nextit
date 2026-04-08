'use client'

import { useState } from 'react'
import Image from 'next/image'

/** Icono para abrir panel lateral (móvil). Usa `/Imagenes/icon_navegacion.png` o SVG de respaldo. */
export default function IconoNavegacion({ className = '', darkMode = false }) {
    const [useFallback, setUseFallback] = useState(false)
    if (useFallback) {
        return (
            <svg className={className} width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
        )
    }
    return (
        <Image
            src="/Imagenes/icon_navegacion.png"
            alt=""
            width={28}
            height={28}
            className={`object-contain ${className} ${darkMode ? 'brightness-0 invert' : ''}`}
            onError={() => setUseFallback(true)}
        />
    )
}
