/**
 * Eventos globales para la mascota Viku (plan Pro + modo activado).
 * Tipos: notification | like | compose | share
 */
export const VIKU_CHAN_EVENT = 'viku-chan-signal'

/** @param {'notification' | 'like' | 'compose' | 'share'} type */
export function emitVikuChanSignal(type) {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new CustomEvent(VIKU_CHAN_EVENT, { detail: { type } }))
}
