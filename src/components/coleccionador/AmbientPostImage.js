'use client'

/**
 * Imagen de publicación con fondo “ambient” (misma foto difuminada y ampliada)
 * para rellenar el espacio cuando la capa nítida usa object-contain (estilo Facebook).
 */
export default function AmbientPostImage({
    src,
    alt = '',
    containerClassName = '',
    foregroundClassName = '',
    innerClassName = '',
    onOpen,
}) {
    if (!src) return null
    const activate = onOpen
        ? {
              role: 'button',
              tabIndex: 0,
              onClick: onOpen,
              onKeyDown: (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onOpen()
                  }
              },
          }
        : {}
    return (
        <div
            className={`relative w-full overflow-hidden ${onOpen ? 'cursor-zoom-in' : ''} ${containerClassName}`}
            {...activate}
        >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={src}
                alt=""
                aria-hidden
                className="pointer-events-none absolute inset-0 z-0 h-full w-full select-none object-cover opacity-90 scale-110 blur-3xl saturate-110 motion-reduce:hidden"
            />
            <div className={`relative z-[1] flex min-h-0 w-full items-center justify-center ${innerClassName}`.trim()}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={alt} className={`max-w-full shrink-0 ${foregroundClassName}`.trim()} />
            </div>
        </div>
    )
}
