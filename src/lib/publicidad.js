import axios from '@/lib/axios'
import { getServerBackendOrigin } from '@/lib/serverBackendUrl'

/**
 * Obtiene la base URL del backend (sin /api/v1).
 */
function getBackendBaseUrl() {
    const o = getServerBackendOrigin()
    if (o) return o
    if (process.env.NEXT_PHASE === 'phase-production-build' || process.env.npm_lifecycle_event === 'build') {
        return ''
    }
    return 'http://127.0.0.1:8000'
}

/**
 * Resuelve la URL de una imagen de publicidad a una URL absoluta que apunte al backend.
 * - URLs relativas (/storage/publicidad/xxx.jpg) → se les antepone la base del backend.
 * - URLs absolutas con /storage/ → se reescriben con la base correcta (por si APP_URL en Laravel
 *   no incluye el puerto, ej. http://localhost en vez de http://localhost:8000).
 */
export function resolvePublicidadUrl(url) {
    if (!url || typeof url !== 'string') return ''
    const base = getBackendBaseUrl()
    const storageMatch = url.match(/(\/storage\/[^\s]*)/)
    const path = storageMatch ? storageMatch[1] : (url.startsWith('/') ? url : '/' + url)
    return base + path
}

/**
 * Normaliza la respuesta del API (objeto con slides o array legacy).
 */
export function normalizePublicidadPayload(raw) {
    if (!raw) {
        return { carrusel_activo: true, slides: [] }
    }
    if (Array.isArray(raw)) {
        return {
            carrusel_activo: true,
            slides: raw.map((p) => ({
                ...p,
                url: typeof p.url === 'string' ? resolvePublicidadUrl(p.url) : p.url,
                enlace: p.enlace ?? null,
            })),
        }
    }
    const slides = Array.isArray(raw.slides) ? raw.slides : []
    return {
        carrusel_activo: raw.carrusel_activo !== false && raw.carrusel_activo !== 0,
        slides: slides.map((p) => ({
            ...p,
            url: typeof p.url === 'string' ? resolvePublicidadUrl(p.url) : p.url,
            enlace: p.enlace ?? null,
        })),
    }
}

/**
 * Obtiene datos del carrusel (ruta pública).
 * @returns {Promise<{ carrusel_activo: boolean, slides: array }>}
 */
export async function getPublicidad() {
    const res = await axios.get('/publicidad')
    return normalizePublicidadPayload(res.data)
}
