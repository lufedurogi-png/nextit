export function slugifyName(name) {
    return String(name || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

export function profileHref({ id, name, currentUserId }) {
    if (Number(id) === Number(currentUserId)) return '/perfil'
    const slug = slugifyName(name)
    return slug ? `/perfil/${id}-${slug}` : `/perfil/${id}`
}

export function parseProfileIdFromParam(param) {
    const raw = String(param || '').trim()
    if (!raw) return null
    const first = raw.split('-')[0]
    const id = Number(first)
    return Number.isFinite(id) && id > 0 ? id : null
}

