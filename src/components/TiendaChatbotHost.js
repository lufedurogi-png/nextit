'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import axios from '@/lib/axios'
import TiendaChatbotFloating from '@/components/TiendaChatbotFloating'

function shouldShowChatbot(pathname) {
    if (!pathname) return false
    if (pathname.startsWith('/admin') || pathname.startsWith('/ventas') || pathname.startsWith('/api')) {
        return false
    }
    if (
        pathname === '/login' ||
        pathname === '/register' ||
        pathname.startsWith('/forgot') ||
        pathname.startsWith('/password') ||
        pathname.startsWith('/verify') ||
        pathname.startsWith('/admin-login') ||
        pathname.startsWith('/ventas-login')
    ) {
        return false
    }

    return (
        pathname === '/' ||
        pathname.startsWith('/tienda') ||
        pathname === '/favoritos' ||
        pathname === '/desarrolladores' ||
        pathname === '/dashboard' ||
        pathname.startsWith('/dashboard/')
    )
}

/**
 * Solo monta el chatbot si la ruta aplica y E-comerce-ia-api está disponible.
 * Si la API no responde (p. ej. en servidor sin Ollama), no se muestra el botón.
 */
export default function TiendaChatbotHost() {
    const pathname = usePathname()
    const routeOk = shouldShowChatbot(pathname)
    const [available, setAvailable] = useState(false)

    useEffect(() => {
        if (!routeOk) {
            setAvailable(false)
            return undefined
        }

        let cancelled = false
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null

        ;(async () => {
            try {
                const { data } = await axios.get('/tienda/chatbot/health', {
                    timeout: 4000,
                    signal: controller?.signal,
                    // Evitar que un 401 hipotético dispare redirect a login
                    validateStatus: (status) => status >= 200 && status < 500,
                })
                if (!cancelled) {
                    setAvailable(!!data?.data?.available)
                }
            } catch {
                if (!cancelled) setAvailable(false)
            }
        })()

        return () => {
            cancelled = true
            controller?.abort()
        }
    }, [routeOk, pathname])

    if (!routeOk || !available) return null

    return <TiendaChatbotFloating />
}
