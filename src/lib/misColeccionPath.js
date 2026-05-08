/**
 * Rutas de detalle: /mis-colecciones/{id}-{slug-legible}
 * El slug es solo cosmético; la carga usa siempre el id numérico inicial.
 */

const MAX_SLUG_LEN = 72

export function slugifyMisColeccionName(name) {
    const raw = String(name ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, MAX_SLUG_LEN)
        .replace(/-+$/g, '')
    return raw || 'coleccion'
}

export function misColeccionPath(collectionId, collectionName) {
    const id = Number(collectionId)
    if (!Number.isFinite(id) || id <= 0) return '/mis-colecciones'
    const slug = slugifyMisColeccionName(collectionName)
    return `/mis-colecciones/${id}-${slug}`
}

/** Parámetro dinámico de la ruta (ej. "5-mi-coleccion"). */
export function parseMisColeccionRouteParam(segment) {
    const raw = String(segment ?? '').trim()
    if (!raw) return { id: null, slugRest: '' }
    const m = raw.match(/^(\d+)(?:-(.+))?$/)
    if (!m) return { id: null, slugRest: '' }
    return { id: Number(m[1]), slugRest: String(m[2] ?? '').trim() }
}
