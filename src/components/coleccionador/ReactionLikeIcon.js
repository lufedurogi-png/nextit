'use client'

const LIKE_MASK = {
    WebkitMaskImage: "url('/Imagenes/icon_like.png')",
    WebkitMaskSize: 'contain',
    WebkitMaskRepeat: 'no-repeat',
    WebkitMaskPosition: 'center',
    maskImage: "url('/Imagenes/icon_like.png')",
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    maskPosition: 'center',
}

/**
 * Pulgar arriba/abajo usando /Imagenes/icon_like.png como máscara sobre `currentColor`
 * (hereda text-* del botón: tema claro/oscuro y acentos del contenedor).
 */
export default function ReactionLikeIcon({ flipped = false, className = 'h-5 w-5' }) {
    return (
        <span
            aria-hidden
            style={LIKE_MASK}
            className={`inline-block shrink-0 bg-current ${flipped ? 'scale-y-[-1]' : ''} ${className}`.trim()}
        />
    )
}
