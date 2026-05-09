'use client'

const SHARE_MASK = {
    WebkitMaskImage: "url('/Imagenes/icon_compartir.png')",
    WebkitMaskSize: 'contain',
    WebkitMaskRepeat: 'no-repeat',
    WebkitMaskPosition: 'center',
    maskImage: "url('/Imagenes/icon_compartir.png')",
    maskSize: 'contain',
    maskRepeat: 'no-repeat',
    maskPosition: 'center',
}

/** Icono compartir: máscara sobre el color del texto del contenedor (tema claro/oscuro). */
export default function ShareLinkIcon({ className = 'h-4 w-4' }) {
    return <span aria-hidden style={SHARE_MASK} className={`inline-block shrink-0 bg-current ${className}`.trim()} />
}
