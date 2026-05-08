export function storageUrl(path) {
    if (!path) return '/Imagenes/usuario.png'
    if (String(path).startsWith('http')) return path
    const raw = (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')
    const root = raw.endsWith('/api') ? raw.slice(0, -4) : raw
    return `${root}/storage/${path}`
}
