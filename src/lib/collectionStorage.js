/**
 * Almacenamiento unificado de cartas obtenidas (Mundial 2026).
 * Migra claves antiguas para no perder progreso.
 */
export const COLLECTION_STORAGE_KEY = 'collected_cards_worldcup_2026'

const LEGACY_KEYS = ['collected_cards']

function parseKeys(raw) {
    try {
        const arr = JSON.parse(raw || '[]')
        return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : []
    } catch {
        return []
    }
}

export function loadCollectedKeys() {
    if (typeof window === 'undefined') return []
    let raw = localStorage.getItem(COLLECTION_STORAGE_KEY)
    if (!raw) {
        for (const k of LEGACY_KEYS) {
            const alt = localStorage.getItem(k)
            if (alt) {
                raw = alt
                localStorage.setItem(COLLECTION_STORAGE_KEY, alt)
                try {
                    localStorage.removeItem(k)
                } catch {
                    // ignorar
                }
                break
            }
        }
    }
    return parseKeys(raw)
}

export function saveCollectedKeys(keys) {
    if (typeof window === 'undefined') return
    const list = Array.from(keys).filter((x) => typeof x === 'string')
    localStorage.setItem(COLLECTION_STORAGE_KEY, JSON.stringify(list))
}
