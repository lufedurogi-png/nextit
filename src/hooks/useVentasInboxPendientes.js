'use client'

import { useCallback, useEffect, useState } from 'react'
import { getChatClientesVentas } from '@/lib/chatApi'

const POLL_MS = 12000

function sumPendientes(lista) {
    return (Array.isArray(lista) ? lista : []).reduce(
        (sum, c) => sum + (Number(c.unanswered_count) || 0),
        0,
    )
}

export function useVentasInboxPendientes({ enabled = true } = {}) {
    const [count, setCount] = useState(0)

    const refresh = useCallback(async () => {
        if (!enabled) return
        try {
            const lista = await getChatClientesVentas()
            setCount(sumPendientes(lista))
        } catch {
            //
        }
    }, [enabled])

    useEffect(() => {
        if (!enabled) {
            setCount(0)
            return
        }
        refresh()
        const interval = setInterval(() => {
            if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
                refresh()
            }
        }, POLL_MS)
        return () => clearInterval(interval)
    }, [enabled, refresh])

    return { count, refresh }
}
