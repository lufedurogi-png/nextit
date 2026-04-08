'use client'

import { useCallback, useRef } from 'react'

const EDGE_PX = 32
const SWIPE_OPEN = 48
const SWIPE_CLOSE = 48

/**
 * Gestos táctiles (solo pensado para móvil): abrir drawer desde el borde izquierdo,
 * cerrar deslizando el panel hacia la izquierda.
 */
export function useMobileLeftDrawerSwipe({ isOpen, onOpen, onClose, enabled = true }) {
    const startRef = useRef(null)

    const onEdgeTouchStart = useCallback(
        (e) => {
            if (!enabled || isOpen) return
            const t = e.touches[0]
            if (t.clientX <= EDGE_PX) {
                startRef.current = { x: t.clientX, y: t.clientY, kind: 'edge' }
            }
        },
        [enabled, isOpen]
    )

    const onEdgeTouchEnd = useCallback(
        (e) => {
            if (!enabled || isOpen || !startRef.current || startRef.current.kind !== 'edge') {
                startRef.current = null
                return
            }
            const t = e.changedTouches[0]
            const dx = t.clientX - startRef.current.x
            const dy = Math.abs(t.clientY - startRef.current.y)
            if (dx > SWIPE_OPEN && dx > dy * 1.1) {
                onOpen?.()
            }
            startRef.current = null
        },
        [enabled, isOpen, onOpen]
    )

    const onDrawerTouchStart = useCallback(
        (e) => {
            if (!enabled || !isOpen) return
            const t = e.touches[0]
            startRef.current = { x: t.clientX, y: t.clientY, kind: 'drawer' }
        },
        [enabled, isOpen]
    )

    const onDrawerTouchEnd = useCallback(
        (e) => {
            if (!enabled || !isOpen || !startRef.current || startRef.current.kind !== 'drawer') {
                startRef.current = null
                return
            }
            const t = e.changedTouches[0]
            const dx = t.clientX - startRef.current.x
            const dy = Math.abs(t.clientY - startRef.current.y)
            if (dx < -SWIPE_CLOSE && Math.abs(dx) > dy * 1.1) {
                onClose?.()
            }
            startRef.current = null
        },
        [enabled, isOpen, onClose]
    )

    return {
        edgeStripProps: {
            onTouchStart: onEdgeTouchStart,
            onTouchEnd: onEdgeTouchEnd,
            style: { touchAction: 'pan-y' },
        },
        drawerTouchProps: {
            onTouchStart: onDrawerTouchStart,
            onTouchEnd: onDrawerTouchEnd,
        },
    }
}
