'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
    const router = useRouter()

    useEffect(() => {
        if (typeof window === 'undefined') return
        const token = localStorage.getItem('auth_token')
        router.replace(token ? '/dashboard' : '/login')
    }, [router])

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-600 text-sm">
            Cargando…
        </div>
    )
}
