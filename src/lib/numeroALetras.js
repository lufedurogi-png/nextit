/**
 * Cantidad en letras (es-MX), para leyendas en documentos.
 * Enteros 0–999999999; montos con centavos.
 */

const UNIDADES = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve']
const DECENAS = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa']
const ESPECIAL = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve']
const CENTENAS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos']

function capitalize(s) {
    if (!s) return ''
    return s.charAt(0).toUpperCase() + s.slice(1)
}

function under100(n) {
    if (n < 10) return UNIDADES[n]
    if (n < 20) return ESPECIAL[n - 10]
    const d = Math.floor(n / 10)
    const u = n % 10
    if (u === 0) return DECENAS[d]
    if (d === 2) return `veinti${UNIDADES[u]}`
    return `${DECENAS[d]} y ${UNIDADES[u]}`
}

function under1000(n) {
    if (n === 0) return ''
    if (n === 100) return 'cien'
    const c = Math.floor(n / 100)
    const rest = n % 100
    const head = c > 0 ? CENTENAS[c] : ''
    const tail = rest > 0 ? under100(rest) : ''
    if (head && tail) return `${head} ${tail}`.trim()
    return (head || tail).trim()
}

export function enteroALetras(n) {
    const num = Number(n)
    if (!Number.isFinite(num) || num < 0) return ''
    const ent = Math.floor(Math.abs(num))
    if (ent > 999999999) return ''
    if (ent === 0) return 'cero'

    const millones = Math.floor(ent / 1000000)
    const milesResto = ent % 1000000
    const miles = Math.floor(milesResto / 1000)
    const unidades = milesResto % 1000

    const parts = []
    if (millones === 1) parts.push('un millón')
    else if (millones > 1) parts.push(`${under1000(millones)} millones`.trim())

    if (miles === 1) parts.push('mil')
    else if (miles > 1) parts.push(`${under1000(miles)} mil`.trim())

    if (unidades > 0) parts.push(under1000(unidades))
    else if (millones > 0 && miles === 0 && !parts.some((p) => p.includes('millón'))) {
        /* ok */
    }

    return parts.join(' ').replace(/\s+/g, ' ').trim()
}

/**
 * Texto legal tipo monto en pesos (incluye centavos).
 * Ej: "un mil doscientos treinta y cuatro PESOS 56/100 M.N."
 */
export function montoALetrasMx(valor) {
    const num = Number(valor)
    if (!Number.isFinite(num) || num < 0) return ''
    const cents = Math.round((Math.round(num * 100) / 100 - Math.floor(num)) * 100)
    const ent = Math.floor(Math.abs(num))
    const letras = capitalize(enteroALetras(ent))
    const c = String(cents).padStart(2, '0')
    return `${letras} PESOS ${c}/100 M.N.`
}

/**
 * Para celdas PDF: número en primera línea, leyenda entre paréntesis debajo (cantidades enteras).
 */
export function celdaCantidadConLetra(n) {
    const ent = Math.floor(Number(n))
    if (!Number.isFinite(ent)) return String(n)
    const l = enteroALetras(ent)
    return `${ent}\n(${l})`
}

/**
 * Monto formateado + leyenda en nueva línea entre paréntesis.
 */
export function celdaMontoConLetra(valor) {
    const num = Number(valor)
    if (!Number.isFinite(num)) return String(valor)
    const fmt = num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    return `$ ${fmt}\n(${montoALetrasMx(num)})`
}
