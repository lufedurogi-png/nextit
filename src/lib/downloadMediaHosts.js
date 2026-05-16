/**
 * Hostnames permitidos para el proxy /api/download-media (evita SSRF).
 * - Siempre se incluye el host de NEXT_PUBLIC_BACKEND_URL (sin /api/v1).
 * - Opcional: DOWNLOAD_MEDIA_ALLOWED_HOSTS (coma) p. ej. api-red.viku.com.mx
 */
export function getDownloadMediaAllowedHosts() {
    const hosts = new Set()

    const extra = process.env.DOWNLOAD_MEDIA_ALLOWED_HOSTS || ''
    for (const part of extra.split(',')) {
        const h = part.trim().toLowerCase()
        if (h) hosts.add(h)
    }

    const raw = (process.env.NEXT_PUBLIC_BACKEND_URL || '').trim()
    if (raw) {
        try {
            let base = raw.replace(/\/$/, '')
            base = base.replace(/\/api\/v1\/?$/i, '')
            base = base.replace(/\/api\/?$/i, '')
            const url = new URL(base.startsWith('http') ? base : `https://${base}`)
            hosts.add(url.hostname.toLowerCase())
        } catch {
            /* ignorar URL inválida */
        }
    }

    return hosts
}

export function isDownloadMediaHostAllowed(hostname, allowed) {
    const h = String(hostname || '').toLowerCase()
    return h && allowed.has(h)
}
