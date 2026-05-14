function isNextProductionBuild() {
    if (process.env.NEXT_PHASE === 'phase-production-build') return true
    if (process.env.npm_lifecycle_event === 'build') return true
    return false
}

/** En el servidor de producción remoto no existe Laravel en localhost; evita fetch fallidos en `next build`. */
function isLocalhostBackendUrl(url) {
    if (!url || typeof url !== 'string') return false
    try {
        const normalized = url.includes('://') ? url : `http://${url}`
        const { hostname } = new URL(normalized)
        return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
    } catch {
        return false
    }
}

/**
 * URL base de la API Laravel para `fetch` en Server Components / `next build`.
 *
 * En Hostinger (y cualquier CI), si no defines `NEXT_PUBLIC_BACKEND_URL`, antes se caía
 * en `http://127.0.0.1:8000` y el build intentaba hablar con un backend inexistente
 * (ECONNREFUSED, timeouts, o corte del runner sin logs claros).
 *
 * Durante `next build` sin esa variable, devolvemos `null` y los helpers SSR deben
 * devolver datos vacíos sin red. Para producción real, configura en el panel de
 * despliegue: NEXT_PUBLIC_BACKEND_URL=https://tu-api.com (con o sin /api/v1 al final).
 */
export function getServerBackendApiBase() {
    const raw = process.env.NEXT_PUBLIC_BACKEND_URL
    if (raw && String(raw).trim()) {
        const normalized = String(raw).replace(/\/$/, '')
        if (isNextProductionBuild() && isLocalhostBackendUrl(normalized)) {
            return null
        }
        return normalized
    }
    if (isNextProductionBuild()) {
        return null
    }
    return 'http://127.0.0.1:8000/api/v1'
}

/** Origen del backend (sin `/api/v1`) para armar URLs de `/storage/...`. */
export function getServerBackendOrigin() {
    const api = getServerBackendApiBase()
    if (!api) return null
    return api.replace(/\/api\/v1\/?$/, '')
}
