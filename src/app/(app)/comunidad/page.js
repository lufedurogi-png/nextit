'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import AppHero from '@/components/coleccionador/AppHero'
import PageFade from '@/components/coleccionador/PageFade'
import TradingCard from '@/components/coleccionador/TradingCard'

const MIS_CARTAS_EXTRAS = [
    { id: 41, imageUrl: '/Imagenes/carta_base.png', cantidad: 1 },
    { id: 87, imageUrl: '/Imagenes/carta_base.png', cantidad: 2 },
    { id: 124, imageUrl: '/Imagenes/carta_base.png', cantidad: 3 },
    { id: 199, imageUrl: '/Imagenes/carta_base.png', cantidad: 1 },
    { id: 245, imageUrl: '/Imagenes/carta_base.png', cantidad: 4 },
    { id: 301, imageUrl: '/Imagenes/carta_base.png', cantidad: 2 },
]

const CARTAS_AMIGOS = [
    { amigo: 'Luis', id: 52, imageUrl: '/Imagenes/carta_base.png', cantidad: 2 },
    { amigo: 'Ana', id: 118, imageUrl: '/Imagenes/carta_base.png', cantidad: 1 },
    { amigo: 'Marcos', id: 244, imageUrl: '/Imagenes/carta_base.png', cantidad: 3 },
    { amigo: 'Sofia', id: 289, imageUrl: '/Imagenes/carta_base.png', cantidad: 2 },
]

const listVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const cardVariants = {
    hidden: { opacity: 0, y: 14, scale: 0.98 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 320, damping: 24 } },
}

export default function ComunidadPage() {
    return (
        <PageFade>
            <AppHero eyebrow="Intercambia y conecta" title="Comunidad" subtitle="Tus repetidas y las de tus amigos.">
                <div className="flex flex-wrap gap-2">
                    <Link
                        href="/planes"
                        className="inline-flex items-center gap-2 rounded-full bg-[#c9a227] px-4 py-2 text-sm font-extrabold text-[#0b1b3c] shadow-lg shadow-amber-900/20 transition hover:brightness-105"
                    >
                        Desbloquear matchmaking Pro
                    </Link>
                </div>
            </AppHero>

            <div className="relative z-[1] mx-auto max-w-2xl space-y-4 px-4 pb-12 -mt-3">
                <motion.section
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-[0_18px_50px_rgba(2,6,23,0.08)] backdrop-blur theme-dark:border-slate-700 theme-dark:bg-slate-900/70"
                >
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h2 className="text-xl font-extrabold app-text">Mis cartas extras</h2>
                            <p className="mt-1 text-sm app-subtle">Repetidas listas para canjear.</p>
                        </div>
                        <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-emerald-700 theme-dark:text-emerald-300">
                            Inventario
                        </span>
                    </div>

                    <motion.div className="mt-4 grid grid-cols-2 gap-3" variants={listVariants} initial="hidden" animate="show">
                        {MIS_CARTAS_EXTRAS.map((card) => (
                            <motion.div key={`extra-${card.id}`} variants={cardVariants} className="relative">
                                <TradingCard
                                    imageUrl={card.imageUrl}
                                    idLabel={String(card.id).padStart(3, '0')}
                                    obtained={false}
                                    readOnly
                                    showObtainControl={false}
                                    footnote={`Extra ×${card.cantidad}`}
                                />
                                <div className="pointer-events-none absolute -bottom-1 left-1/2 z-[2] -translate-x-1/2 rounded-full bg-[#0b1b3c]/90 px-3 py-1 text-[0.65rem] font-black text-white shadow-lg">
                                    ×{card.cantidad}
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                </motion.section>

                <motion.section
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 }}
                    className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-[0_18px_50px_rgba(2,6,23,0.08)] backdrop-blur theme-dark:border-slate-700 theme-dark:bg-slate-900/70"
                >
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h2 className="text-xl font-extrabold app-text">Amigos y repetidas</h2>
                            <p className="mt-1 text-sm app-subtle">Simulación de red: quién tiene qué, para planear el intercambio.</p>
                        </div>
                        <span className="rounded-full bg-blue-500/15 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-blue-700 theme-dark:text-blue-300">
                            Social
                        </span>
                    </div>

                    <motion.div className="mt-4 grid grid-cols-2 gap-3" variants={listVariants} initial="hidden" animate="show">
                        {CARTAS_AMIGOS.map((item) => (
                            <motion.div key={`friend-${item.amigo}-${item.id}`} variants={cardVariants} className="relative">
                                <TradingCard
                                    imageUrl={item.imageUrl}
                                    idLabel={String(item.id).padStart(3, '0')}
                                    obtained={false}
                                    readOnly
                                    showObtainControl={false}
                                    footnote={`${item.amigo} · ×${item.cantidad}`}
                                />
                                <p className="mt-2 text-center text-xs font-bold text-slate-700 theme-dark:text-slate-200">{item.amigo}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                </motion.section>
            </div>
        </PageFade>
    )
}
