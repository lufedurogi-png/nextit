'use client'

import { useCallback, useEffect, useRef } from 'react'

const NEAR_BOTTOM_PX = 120

/**
 * Auto-scroll solo si el usuario está abajo o acaba de enviar un mensaje.
 */
export function useChatAutoScroll(scrollRef, mensajes, { forceKey = 0 } = {}) {
    const nearBottomRef = useRef(true)

    const onScroll = useCallback(() => {
        const el = scrollRef.current
        if (!el) return
        nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight <= NEAR_BOTTOM_PX
    }, [scrollRef])

    const scrollToBottom = useCallback(
        (behavior = 'auto') => {
            const el = scrollRef.current
            if (!el) return
            el.scrollTo({ top: el.scrollHeight, behavior })
            nearBottomRef.current = true
        },
        [scrollRef]
    )

    useEffect(() => {
        const el = scrollRef.current
        if (!el) return
        el.addEventListener('scroll', onScroll, { passive: true })
        return () => el.removeEventListener('scroll', onScroll)
    }, [scrollRef, onScroll])

    useEffect(() => {
        const el = scrollRef.current
        if (!el || !mensajes?.length) return

        if (nearBottomRef.current) {
            requestAnimationFrame(() => {
                el.scrollTop = el.scrollHeight
            })
        }
    }, [mensajes, scrollRef])

    useEffect(() => {
        scrollToBottom('auto')
    }, [forceKey, scrollToBottom])

    return { scrollToBottom }
}
