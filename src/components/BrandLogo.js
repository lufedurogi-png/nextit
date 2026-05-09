'use client'

/**
 * Logo de marca desde /public (SVG o PNG). Usa <img> nativo para evitar fallos de
 * next/image con SVG y chunks rotos en dev (.next).
 * Usa el logo real del proyecto.
 */
export const LOGO_SRC = '/Imagenes/logo_nxtIt.png'

export default function BrandLogo({ centered = false, compact = false, className = '' }) {
    const sizeClass = compact
        ? 'h-7 w-auto max-w-[140px] min-h-[28px]'
        : 'h-10 w-auto max-w-[min(100%,280px)] min-h-[36px]'
    return (
        <img
            src={LOGO_SRC}
            alt="Viku"
            width={compact ? 140 : 240}
            height={compact ? 28 : 48}
            className={`${sizeClass} object-contain ${centered ? 'mx-auto' : 'object-left'} ${className}`.trim()}
            decoding="async"
            fetchPriority="high"
        />
    )
}
