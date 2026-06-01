/** Normaliza para comparación (minúsculas, sin acentos). */
export function normalizeSearchText(value) {
    return String(value ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
}

function levenshtein(a, b) {
    if (a === b) return 0
    if (!a.length) return b.length
    if (!b.length) return a.length
    const row = Array.from({ length: b.length + 1 }, (_, i) => i)
    for (let i = 1; i <= a.length; i++) {
        let prev = i
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1
            const next = Math.min(row[j] + 1, prev + 1, row[j - 1] + cost)
            row[j - 1] = prev
            prev = next
        }
        row[b.length] = prev
    }
    return row[b.length]
}

/** Similitud 0–1 entre dos cadenas. */
export function similarityScore(a, b) {
    const na = normalizeSearchText(a)
    const nb = normalizeSearchText(b)
    if (!na || !nb) return 0
    if (na === nb) return 1
    if (na.includes(nb) || nb.includes(na)) return 0.95
    const dist = levenshtein(na, nb)
    return 1 - dist / Math.max(na.length, nb.length)
}

export const FUZZY_THRESHOLD = 0.7

/**
 * ¿El texto coincide con la consulta (umbral 70 % por defecto)?
 * También prueba por palabras de la consulta.
 */
export function fuzzyMatches(query, text, threshold = FUZZY_THRESHOLD) {
    const q = normalizeSearchText(query)
    const t = normalizeSearchText(text)
    if (!q || !t) return false
    if (similarityScore(q, t) >= threshold) return true
    const tokens = q.split(' ').filter((w) => w.length >= 2)
    if (tokens.length === 0) return similarityScore(q, t) >= threshold
    return tokens.some((tok) => similarityScore(tok, t) >= threshold || t.includes(tok))
}

/** Puntaje máximo entre consulta completa y tokens contra varios campos. */
export function bestFuzzyScore(query, fields, threshold = FUZZY_THRESHOLD) {
    const parts = (Array.isArray(fields) ? fields : [fields]).filter(Boolean).map(String)
    if (!parts.length) return 0
    let best = 0
    for (const field of parts) {
        const q = normalizeSearchText(query)
        const f = normalizeSearchText(field)
        if (!q || !f) continue
        best = Math.max(best, similarityScore(q, f))
        const tokens = q.split(' ').filter((w) => w.length >= 2)
        for (const tok of tokens) {
            best = Math.max(best, similarityScore(tok, f))
            if (f.includes(tok)) best = Math.max(best, 0.85)
        }
    }
    return best >= threshold ? best : 0
}
