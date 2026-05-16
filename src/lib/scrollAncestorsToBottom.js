/**
 * Desplaza al final el primer ancestro con scroll vertical real.
 * Sirve cuando el contenedor con overflow no es el mismo nodo que el ref (p. ej. lightbox móvil unificado).
 */
export function scrollAncestorsToBottom(startEl, options = { behavior: 'smooth' }) {
    if (!startEl || typeof window === 'undefined') return
    let node = startEl
    while (node && node !== document.documentElement) {
        const { overflowY } = window.getComputedStyle(node)
        const oy = overflowY === 'overlay' ? 'auto' : overflowY
        if ((oy === 'auto' || oy === 'scroll') && node.scrollHeight > node.clientHeight + 1) {
            node.scrollTo({ top: node.scrollHeight, ...options })
            return
        }
        node = node.parentElement
    }
    startEl.scrollIntoView({ behavior: options.behavior ?? 'smooth', block: 'end' })
}
