/** Id numérico del servidor (ignora temporales pending). */
export function maxChatMessageId(mensajes) {
    if (!Array.isArray(mensajes) || mensajes.length === 0) return 0
    let max = 0
    for (const m of mensajes) {
        if (m?.pending || String(m?.id).startsWith('temp-')) continue
        const id = Number(m.id)
        if (Number.isFinite(id) && id > max) max = id
    }
    return max
}

function sortByFecha(a, b) {
    return new Date(a.created_at) - new Date(b.created_at)
}

function pendingYaEnServidor(pending, serverList) {
    return serverList.some(
        (m) =>
            m.body === pending.body &&
            Math.abs(new Date(m.created_at) - new Date(pending.created_at)) < 15000
    )
}

/**
 * Carga inicial: reemplaza con la lista del servidor + pendientes locales.
 */
export function setChatMessagesFromServer(prev, serverList) {
    const incoming = Array.isArray(serverList) ? serverList : []
    const pending = (prev || []).filter((m) => m.pending || String(m.id).startsWith('temp-'))
    if (pending.length === 0) return incoming

    const merged = [...incoming]
    pending.forEach((p) => {
        if (!pendingYaEnServidor(p, incoming)) merged.push(p)
    })
    merged.sort(sortByFecha)
    return merged
}

/**
 * Polling incremental: solo agrega mensajes nuevos o actualiza editados.
 * Devuelve la misma referencia si no hubo cambios (evita re-render).
 */
export function appendChatMessagesFromServer(prev, deltaList) {
    const delta = Array.isArray(deltaList) ? deltaList : []
    if (delta.length === 0) return prev

    const pending = prev.filter((m) => m.pending || String(m.id).startsWith('temp-'))
    const map = new Map()
    for (const m of prev) {
        if (!m.pending && !String(m.id).startsWith('temp-')) {
            map.set(m.id, m)
        }
    }

    let changed = false
    for (const m of delta) {
        const existing = map.get(m.id)
        if (!existing) {
            map.set(m.id, m)
            changed = true
        } else if (existing.body !== m.body || existing.updated_at !== m.updated_at) {
            map.set(m.id, m)
            changed = true
        }
    }

    if (!changed) return prev

    const merged = Array.from(map.values()).sort(sortByFecha)
    pending.forEach((p) => {
        if (!pendingYaEnServidor(p, merged)) merged.push(p)
    })
    merged.sort(sortByFecha)
    return merged
}

/** Fusiona lista completa del servidor (fallback) sin reemplazar si no cambió. */
export function mergeChatMessagesFull(prev, serverList) {
    const incoming = Array.isArray(serverList) ? serverList : []
    const pending = prev.filter((m) => m.pending || String(m.id).startsWith('temp-'))

    const map = new Map(incoming.map((m) => [m.id, m]))
    let changed = incoming.length !== prev.filter((m) => !m.pending && !String(m.id).startsWith('temp-')).length

    if (!changed) {
        for (const m of incoming) {
            const old = prev.find((x) => x.id === m.id)
            if (!old || old.body !== m.body || old.updated_at !== m.updated_at) {
                changed = true
                break
            }
        }
    }

    if (!changed && pending.length === prev.filter((m) => m.pending || String(m.id).startsWith('temp-')).length) {
        return prev
    }

    const merged = [...incoming]
    pending.forEach((p) => {
        if (!pendingYaEnServidor(p, incoming)) merged.push(p)
    })
    merged.sort(sortByFecha)
    return merged
}
