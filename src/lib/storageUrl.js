function encodePathSegments(path) {
    return String(path)
        .replace(/^\/+/, '')
        .split('/')
        .filter(Boolean)
        .map(seg => {
            try {
                return encodeURIComponent(decodeURIComponent(seg))
            } catch {
                return encodeURIComponent(seg)
            }
        })
        .join('/')
}

/**
 * URL pública de un archivo en storage del API.
 * Codifica cada segmento para que espacios/tildes no rompan en algunos navegadores.
 */
export function storageUrl(path) {
    if (!path) return '/Imagenes/usuario.png'

    const rawPath = String(path)

    if (rawPath.startsWith('http://') || rawPath.startsWith('https://')) {
        try {
            const u = new URL(rawPath)
            u.pathname = `/${encodePathSegments(u.pathname)}`
            return u.toString()
        } catch {
            return rawPath
        }
    }

    const raw = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000').replace(
        /\/$/,
        '',
    )
    const root = raw.endsWith('/api') ? raw.slice(0, -4) : raw
    return `${root}/storage/${encodePathSegments(rawPath)}`
}
