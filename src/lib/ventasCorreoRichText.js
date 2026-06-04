/** Fuentes compatibles con la mayoría de clientes de correo. */
export const FUENTES_CORREO = [
    { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
    { label: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
    { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
    { label: 'Tahoma', value: 'Tahoma, Geneva, sans-serif' },
    { label: 'Trebuchet MS', value: 'Trebuchet MS, Helvetica, sans-serif' },
    { label: 'Segoe UI', value: 'Segoe UI, Tahoma, Geneva, sans-serif' },
    { label: 'Calibri', value: 'Calibri, Arial, sans-serif' },
    { label: 'Century Gothic', value: 'Century Gothic, sans-serif' },
    { label: 'Franklin Gothic', value: 'Franklin Gothic Medium, Arial, sans-serif' },
    { label: 'Gill Sans', value: 'Gill Sans, Gill Sans MT, Calibri, sans-serif' },
    { label: 'Lucida Sans', value: 'Lucida Sans Unicode, Lucida Grande, sans-serif' },
    { label: 'Candara', value: 'Candara, Calibri, Segoe, sans-serif' },
    { label: 'Optima', value: 'Optima, Segoe, Candara, sans-serif' },
    { label: 'Futura', value: 'Futura, Trebuchet MS, Arial, sans-serif' },
    { label: 'Times New Roman', value: 'Times New Roman, Times, serif' },
    { label: 'Georgia', value: 'Georgia, Times New Roman, Times, serif' },
    { label: 'Palatino', value: 'Palatino Linotype, Book Antiqua, Palatino, serif' },
    { label: 'Garamond', value: 'Garamond, Baskerville, Times New Roman, serif' },
    { label: 'Book Antiqua', value: 'Book Antiqua, Palatino, serif' },
    { label: 'Cambria', value: 'Cambria, Georgia, serif' },
    { label: 'Courier New', value: 'Courier New, Courier, monospace' },
    { label: 'Consolas', value: 'Consolas, Monaco, monospace' },
    { label: 'Lucida Console', value: 'Lucida Console, Monaco, monospace' },
    { label: 'Monaco', value: 'Monaco, Consolas, monospace' },
    { label: 'Comic Sans MS', value: 'Comic Sans MS, cursive, sans-serif' },
    { label: 'Brush Script MT', value: 'Brush Script MT, cursive' },
    { label: 'Impact', value: 'Impact, Haettenschweiler, Arial Narrow, sans-serif' },
    { label: 'Arial Black', value: 'Arial Black, Arial Bold, Gadget, sans-serif' },
]

export const TAMANOS_LETRA_CORREO = [
    { label: '10 px', value: '10px' },
    { label: '11 px', value: '11px' },
    { label: '12 px', value: '12px' },
    { label: '13 px', value: '13px' },
    { label: '14 px', value: '14px' },
    { label: '16 px', value: '16px' },
    { label: '18 px', value: '18px' },
    { label: '20 px', value: '20px' },
    { label: '22 px', value: '22px' },
    { label: '24 px', value: '24px' },
    { label: '28 px', value: '28px' },
    { label: '32 px', value: '32px' },
    { label: '36 px', value: '36px' },
]

/** Resaltado tipo marcador (fondo detrás del texto), estilo Word. */
export const RESALTADO_COLORES_CORREO = [
    { label: 'Quitar resaltado', value: 'transparent', color: '#ffffff', border: true },
    { label: 'Amarillo', value: '#fef08a', color: '#fef08a' },
    { label: 'Verde', value: '#bbf7d0', color: '#bbf7d0' },
    { label: 'Cian', value: '#a5f3fc', color: '#a5f3fc' },
    { label: 'Azul', value: '#bfdbfe', color: '#bfdbfe' },
    { label: 'Rosa', value: '#fbcfe8', color: '#fbcfe8' },
    { label: 'Naranja', value: '#fed7aa', color: '#fed7aa' },
    { label: 'Morado', value: '#e9d5ff', color: '#e9d5ff' },
    { label: 'Rojo', value: '#fecaca', color: '#fecaca' },
    { label: 'Gris', value: '#e5e7eb', color: '#e5e7eb' },
    { label: 'Lima', value: '#d9f99d', color: '#d9f99d' },
    { label: 'Melocotón', value: '#ffedd5', color: '#ffedd5' },
]

/**
 * Aplica estilos inline al texto seleccionado dentro del editor.
 * Mantiene el texto resaltado/seleccionado tras aplicar el estilo.
 */
export function aplicarEstiloEnSeleccion(editorEl, styles, onSync) {
    if (!editorEl) return false
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return false

    const range = sel.getRangeAt(0)
    if (!editorEl.contains(range.commonAncestorContainer)) return false
    if (range.collapsed) return false

    const span = document.createElement('span')
    Object.entries(styles).forEach(([key, val]) => {
        if (val != null && String(val).trim() !== '') {
            span.style[key] = val
        }
    })

    try {
        range.surroundContents(span)
    } catch {
        const fragment = range.extractContents()
        span.appendChild(fragment)
        range.insertNode(span)
    }

    editorEl.focus()
    const newRange = document.createRange()
    newRange.selectNodeContents(span)
    sel.removeAllRanges()
    sel.addRange(newRange)
    onSync?.()
    return true
}
