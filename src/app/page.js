'use client'

import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const WELCOME_WORDS = ['Bienvenido', 'Welcome', 'Bienvenue', 'Willkommen', 'Benvenuto', 'Bem-vindo', 'Yokoso', 'Marhaba']

const RHOMBOIDS = [
    { word: WELCOME_WORDS[0], width: 240, top: '8%', left: '-6%', delay: 0, duration: 12 },
    { word: WELCOME_WORDS[1], width: 260, top: '18%', left: '72%', delay: 0.5, duration: 14 },
    { word: WELCOME_WORDS[2], width: 230, top: '35%', left: '6%', delay: 0.8, duration: 11 },
    { word: WELCOME_WORDS[3], width: 280, top: '48%', left: '66%', delay: 0.2, duration: 13 },
    { word: WELCOME_WORDS[4], width: 220, top: '64%', left: '-4%', delay: 0.3, duration: 10 },
    { word: WELCOME_WORDS[5], width: 300, top: '74%', left: '58%', delay: 1, duration: 15 },
    { word: WELCOME_WORDS[6], width: 260, top: '84%', left: '12%', delay: 0.7, duration: 12 },
    { word: WELCOME_WORDS[7], width: 240, top: '28%', left: '40%', delay: 1.2, duration: 16 },
]

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
        }, 2000)
        return () => window.clearTimeout(t)
    }, [router])

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_18%_15%,rgba(148,163,184,0.24),transparent_38%),radial-gradient(circle_at_85%_80%,rgba(56,189,248,0.2),transparent_38%),linear-gradient(125deg,#0f172a_0%,#1e293b_48%,#111827_100%)]">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(125deg,transparent_0%,rgba(148,163,184,0.08)_45%,transparent_100%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(148,163,184,0.14),transparent_58%)]" />

            {RHOMBOIDS.map((item, idx) => (
                <motion.div
                    key={`${item.word}-${idx}`}
                    className="pointer-events-none absolute z-[1]"
                    style={{ top: item.top, left: item.left, width: `${item.width}px` }}
                    initial={{ opacity: 0, x: idx % 2 === 0 ? -55 : 55, y: 30, rotate: -14 }}
                    animate={{
                        opacity: [0.16, 0.5, 0.16],
                        x: [0, idx % 2 === 0 ? 62 : -62, 0],
                        y: [0, -34, 0],
                        rotate: [-14, -8, -14],
                    }}
                    transition={{
                        delay: item.delay,
                        duration: item.duration,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                >
                    <div className="relative h-12 overflow-hidden rounded-xl border border-white/25 bg-white/10 px-6 text-center backdrop-blur-sm [clip-path:polygon(9%_0%,100%_0%,91%_100%,0%_100%)]">
                        <span className="leading-12 text-[10px] font-bold uppercase tracking-[0.28em] text-white/85">{item.word}</span>
                    </div>
                </motion.div>
            ))}

            <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 14 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.9, ease: [0.2, 0.9, 0.2, 1] }}
                className="relative z-[2] mx-6 w-full max-w-xl rounded-[2rem] border border-white/20 bg-white/10 px-8 py-10 text-center shadow-[0_34px_120px_rgba(2,6,23,0.55)] backdrop-blur-2xl"
            >
                <motion.h1
                    className="font-playfair mt-1 bg-gradient-to-r from-slate-100 via-cyan-100 to-indigo-200 bg-clip-text text-6xl font-black text-transparent sm:text-7xl"
                    animate={{ filter: ['drop-shadow(0 0 0 rgba(56,189,248,0))', 'drop-shadow(0 0 18px rgba(56,189,248,0.35))', 'drop-shadow(0 0 0 rgba(56,189,248,0))'] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                >
                    Viku
                </motion.h1>
                <p className="mt-3 text-sm font-semibold tracking-[0.08em] text-slate-200/70">Red de coleccionistas</p>

                <div className="mt-7 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                        className="h-full w-1/2 rounded-full bg-gradient-to-r from-cyan-300 via-indigo-300 to-blue-500"
                        initial={{ x: '-130%' }}
                        animate={{ x: '220%' }}
                        transition={{ duration: 1.25, repeat: Infinity, ease: 'linear' }}
                    />
                </div>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300/80">Entrando...</p>
            </motion.div>
        </div>
    )
}
