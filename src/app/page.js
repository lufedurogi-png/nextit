'use client'

import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
    const router = useRouter()

    useEffect(() => {
        if (typeof window === 'undefined') return
        const token = localStorage.getItem('auth_token')
        const t = window.setTimeout(() => {
            if (!token) {
                router.replace('/login')
                return
            }
            let dest = '/inicio'
            try {
                const u = JSON.parse(localStorage.getItem('auth_user') || 'null')
                if (u?.role === 'admin') dest = '/admin-home'
            } catch {
                void 0
            }
            router.replace(dest)
        }, 900)
        return () => window.clearTimeout(t)
    }, [router])

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.35),transparent_45%),radial-gradient(circle_at_80%_10%,rgba(201,162,39,0.28),transparent_40%),linear-gradient(135deg,#070f24_0%,#0b1b3c_45%,#111827_100%)]">
            <div className="foil-back-pattern pointer-events-none absolute inset-0 opacity-35 mix-blend-screen" />

            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 220, damping: 18 }}
                className="relative z-[1] mx-6 w-full max-w-md rounded-[1.75rem] border border-white/15 bg-white/10 p-8 text-center shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl"
            >
                <motion.div
                    aria-hidden
                    className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl border border-white/20 bg-white/10"
                    animate={{ rotate: [0, 1.2, -1.2, 0] }}
                    transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
                >
                    <span className="text-3xl">📦</span>
                </motion.div>
                <p className="text-xs font-black uppercase tracking-[0.35em] text-white/70">Coleccionador</p>
                <h1 className="font-playfair mt-3 text-3xl font-extrabold text-white">Red de coleccionistas</h1>
                <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                        className="h-full w-1/2 rounded-full bg-indigo-400"
                        initial={{ x: '-120%' }}
                        animate={{ x: '220%' }}
                        transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
                    />
                </div>
                <p className="mt-4 text-xs font-semibold text-white/60">Entrando…</p>
            </motion.div>
        </div>
    )
}
