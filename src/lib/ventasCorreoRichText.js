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

const STYLE_PROP_MAP = {
    fontFamily: 'font-family',
    fontSize: 'font-size',
    backgroundColor: 'background-color',
    color: 'color',
    textDecoration: 'text-decoration',
}

function estilosAInlineCss(styles) {
    return Object.entries(styles)
        .filter(([, v]) => v != null && String(v).trim() !== '')
        .map(([k, v]) => `${STYLE_PROP_MAP[k] || k}: ${v}`)
        .join('; ')
}

/** Resuelve el stack canónico a partir de lo que el navegador escribió en font-family. */
export function resolverFuenteCanonica(fontFamily) {
    if (!fontFamily || typeof fontFamily !== 'string') return null
    const raw = fontFamily.trim().replace(/['"]/g, '')
    if (!raw) return null

    for (const f of FUENTES_CORREO) {
        if (raw.toLowerCase() === f.value.toLowerCase()) return f.value
    }

    const primary = raw.split(',')[0].trim().toLowerCase()
    for (const f of FUENTES_CORREO) {
        if (f.label.toLowerCase() === primary) return f.value
        if (f.value.toLowerCase().startsWith(primary)) return f.value
    }

    for (const f of FUENTES_CORREO) {
        if (raw.toLowerCase().includes(f.label.toLowerCase())) return f.value
    }

    return null
}

function parsearEstiloInline(styleStr) {
    const out = {}
    if (!styleStr || typeof styleStr !== 'string') return out
    styleStr.split(';').forEach((piece) => {
        const idx = piece.indexOf(':')
        if (idx === -1) return
        const key = piece.slice(0, idx).trim().toLowerCase()
        const val = piece.slice(idx + 1).trim()
        if (key) out[key] = val
    })
    return out
}

function rgbAHex(color) {
    if (!color) return null
    const c = color.trim().toLowerCase()
    if (c === 'transparent') return 'transparent'
    if (/^#[0-9a-f]{3,6}$/i.test(c)) {
        if (c.length === 4) {
            return `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}`
        }
        return c
    }
    const m = c.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/)
    if (!m) return null
    const hex = (n) => Math.min(255, parseInt(n, 10)).toString(16).padStart(2, '0')
    return `#${hex(m[1])}${hex(m[2])}${hex(m[3])}`
}

/** Normaliza fuentes y colores de resaltado antes de guardar o enviar. */
export function normalizarHtmlCorreo(html) {
    if (typeof document === 'undefined' || !html?.trim()) return html || ''

    const div = document.createElement('div')
    div.innerHTML = html

    div.querySelectorAll('span').forEach((span) => {
        const parsed = parsearEstiloInline(span.getAttribute('style') || '')
        const fam =
            span.style.fontFamily ||
            parsed['font-family'] ||
            null
        const canonFam = resolverFuenteCanonica(fam)
        if (canonFam) parsed['font-family'] = canonFam

        const bg = span.style.backgroundColor || parsed['background-color']
        const hexBg = rgbAHex(bg)
        if (hexBg) {
            const permitido = RESALTADO_COLORES_CORREO.some((r) => r.value === hexBg || r.value === 'transparent')
            if (permitido || hexBg === 'transparent') parsed['background-color'] = hexBg
        }

        const size = span.style.fontSize || parsed['font-size']
        if (size) {
            const px = String(size).toLowerCase().replace(/(\d+)\.0+px/, '$1px')
            if (TAMANOS_LETRA_CORREO.some((t) => t.value === px)) parsed['font-size'] = px
        }

        const keys = Object.keys(parsed)
        if (keys.length === 0) {
            span.removeAttribute('style')
            return
        }
        const css = keys.map((k) => `${k}: ${parsed[k]}`).join('; ')
        span.setAttribute('style', css)
    })

    return div.innerHTML
}

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
    const css = estilosAInlineCss(styles)
    if (css) {
        span.setAttribute('style', css)
    }

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
