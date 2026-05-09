/**
 * Enlaces profundos al feed de inicio (mismo formato que antes usaba la vista Inicio).
 */
export function buildFeedPostShareUrl(postId) {
    if (typeof window === 'undefined') return ''
    const id = Number(postId)
    return `${window.location.origin}/inicio?type=feed&post=${id}#inicio-post-feed-${id}`
}

export function buildGroupPostShareUrl(postId) {
    if (typeof window === 'undefined') return ''
    const id = Number(postId)
    return `${window.location.origin}/inicio?type=group&post=${id}#inicio-post-group-${id}`
}

export async function shareNativeOrClipboard(url, options = {}) {
    if (!url || typeof window === 'undefined') return
    const { title = 'Compartir publicación', text = 'Mira esta publicación en Viku' } = options

    if (navigator.share) {
        try {
            await navigator.share({ title, text, url })
            return
        } catch (err) {
            if (err?.name === 'AbortError') return
        }
    }

    try {
        await navigator.clipboard.writeText(url)
        window.alert('Enlace copiado al portapapeles.')
    } catch {
        window.prompt('Copia este enlace:', url)
    }
}
