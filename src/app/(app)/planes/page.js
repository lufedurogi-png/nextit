'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useState } from 'react'
import AppHero from '@/components/coleccionador/AppHero'
import PageFade from '@/components/coleccionador/PageFade'

const PLANS = [
    {
        id: 'starter',
        name: 'Starter',
        price: '$0',
        cadence: 'para siempre',
        blurb: 'Perfecto para empezar el álbum y sentir la experiencia.',
        highlight: false,
        features: ['Checklist completo del catálogo demo', 'Escaneo simulado + cámara', 'Progreso local en tu celular', 'Tema claro / oscuro'],
        cta: 'Ya lo tienes',
        tone: 'border-slate-200 bg-white/90 theme-dark:border-slate-700 theme-dark:bg-slate-900/70',
    },
    {
        id: 'pro',
        name: 'Pro Coleccionista',
        price: '$99',
        cadence: '/ año',
        blurb: 'Para quien quiere llevar el hobby en serio.',
        highlight: true,
        badge: 'Más popular',
        features: [
            'Sincronización en la nube',
            'Estadísticas avanzadas de completitud',
            'Intercambios priorizados en Comunidad',
            'Alertas de cartas nuevas / ofertas',
            'Soporte prioritario por correo',
        ],
        cta: 'Elegir Pro',
        tone: 'border-[#c9a227]/70 bg-[linear-gradient(180deg,rgba(201,162,39,0.18),rgba(255,255,255,0.92))] shadow-[0_26px_80px_rgba(201,162,39,0.22)] theme-dark:bg-[linear-gradient(180deg,rgba(201,162,39,0.22),rgba(15,23,42,0.92))]',
    },
]

const FAQ = [
    {
        q: '¿Esto ya cobra de verdad?',
        a: 'Los cobros se habilitan al elegir un plan y completar el proceso de pago.',
    },
    {
        q: '¿Qué pasa con mis cartas si cambio de teléfono?',
        a: 'Tu progreso se conserva al iniciar sesión con tu cuenta y mantener la sincronización activa.',
    },
    {
        q: '¿Incluye cartas físicas?',
        a: 'El producto digital es independiente del álbum físico; aquí ordenas tu colección y tus intercambios.',
    },
]

export default function PlanesPage() {
    const [openFaq, setOpenFaq] = useState(0)

    return (
        <PageFade>
            <AppHero eyebrow="Membresías" title="Planes">
                <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-3 py-2 text-xs font-semibold text-white/90">
                        Demo visual · sin cobro todavía
                    </span>
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
                    >
                        Volver al panel
                    </Link>
                </div>
            </AppHero>

            <div className="relative z-[1] mx-auto max-w-5xl px-4 pb-14 -mt-4">
                <div className="mx-auto grid max-w-3xl gap-4 lg:grid-cols-2">
                    {PLANS.map((plan, idx) => (
                        <motion.article
                            key={plan.id}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.05 * idx, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                            className={`relative overflow-hidden rounded-[1.6rem] border p-5 ${plan.tone}`}
                        >
                            {plan.highlight ? (
                                <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[#c9a227]/25 blur-3xl" />
                            ) : null}
                            {plan.badge ? (
                                <div className="mb-3 inline-flex items-center rounded-full bg-[#0b1b3c] px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.22em] text-white">
                                    {plan.badge}
                                </div>
                            ) : null}
                            <h2 className="font-playfair text-2xl font-extrabold text-slate-900 theme-dark:text-slate-50">{plan.name}</h2>
                            <p className="mt-2 text-sm text-slate-600 theme-dark:text-slate-300">{plan.blurb}</p>
                            <div className="mt-5 flex items-end gap-2">
                                <p className="font-playfair text-4xl font-extrabold text-slate-900 theme-dark:text-slate-50">{plan.price}</p>
                                <p className="pb-1 text-sm font-semibold text-slate-500 theme-dark:text-slate-400">{plan.cadence}</p>
                            </div>

                            <ul className="mt-5 space-y-2">
                                {plan.features.map((f) => (
                                    <li key={f} className="flex gap-2 text-sm text-slate-700 theme-dark:text-slate-200">
                                        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 theme-dark:text-emerald-300">
                                            ✓
                                        </span>
                                        <span>{f}</span>
                                    </li>
                                ))}
                            </ul>

                            <div className="mt-6">
                                <button
                                    type="button"
                                    className={`w-full rounded-2xl px-4 py-3 text-sm font-extrabold shadow-sm transition active:scale-[0.99] ${
                                        plan.highlight
                                            ? 'bg-[#0b1b3c] text-white hover:brightness-110'
                                            : 'border border-slate-300 bg-white text-slate-900 hover:border-[#c9a227] theme-dark:border-slate-600 theme-dark:bg-slate-950 theme-dark:text-slate-50'
                                    }`}
                                >
                                    {plan.cta}
                                </button>
                                <p className="mt-2 text-center text-[0.7rem] font-semibold text-slate-500 theme-dark:text-slate-400">
                                    Sin cargo real en esta versión demo
                                </p>
                            </div>
                        </motion.article>
                    ))}
                </div>

                <motion.section
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="mt-8 rounded-[1.6rem] border border-slate-200 bg-white/90 p-5 shadow-[0_18px_60px_rgba(2,6,23,0.08)] backdrop-blur theme-dark:border-slate-700 theme-dark:bg-slate-900/70"
                >
                    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                        <div>
                            <h3 className="font-playfair text-2xl font-extrabold text-slate-900 theme-dark:text-slate-50">Comparación rápida</h3>
                            <p className="mt-1 text-sm text-slate-600 theme-dark:text-slate-300">Dos niveles: empezar y crecer con Pro.</p>
                        </div>
                    </div>

                    <div className="mt-5 overflow-x-auto">
                        <table className="w-full min-w-[520px] border-separate border-spacing-0 text-sm">
                            <thead>
                                <tr className="text-left text-xs font-black uppercase tracking-[0.18em] text-slate-500 theme-dark:text-slate-400">
                                    <th className="rounded-l-2xl bg-slate-50 px-4 py-3 theme-dark:bg-slate-950/40">Beneficio</th>
                                    <th className="bg-slate-50 px-4 py-3 theme-dark:bg-slate-950/40">Inicial</th>
                                    <th className="rounded-r-2xl bg-[#c9a227]/15 px-4 py-3 text-[#0b1b3c] theme-dark:bg-[#c9a227]/20 theme-dark:text-slate-50">
                                        Pro
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="text-slate-700 theme-dark:text-slate-200">
                                {[
                                    ['Sincronización en la nube', '—', '✓'],
                                    ['Intercambios priorizados', '—', '✓'],
                                    ['Estadísticas avanzadas', '—', '✓'],
                                    ['Soporte prioritario', '—', '✓'],
                                ].map((row) => (
                                    <tr key={row[0]} className="border-t border-slate-200 theme-dark:border-slate-800">
                                        <td className="px-4 py-3 font-semibold">{row[0]}</td>
                                        <td className="px-4 py-3">{row[1]}</td>
                                        <td className="bg-[#c9a227]/5 px-4 py-3 font-bold">{row[2]}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </motion.section>

                <motion.section
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mt-8 rounded-[1.6rem] border border-slate-200 bg-white/90 p-5 theme-dark:border-slate-700 theme-dark:bg-slate-900/70"
                >
                    <h3 className="font-playfair text-2xl font-extrabold text-slate-900 theme-dark:text-slate-50">Preguntas frecuentes</h3>
                    <div className="mt-4 space-y-2">
                        {FAQ.map((item, idx) => {
                            const open = openFaq === idx
                            return (
                                <button
                                    key={item.q}
                                    type="button"
                                    onClick={() => setOpenFaq(open ? -1 : idx)}
                                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-[#c9a227]/60 theme-dark:border-slate-800 theme-dark:bg-slate-950/35"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-sm font-extrabold text-slate-900 theme-dark:text-slate-50">{item.q}</p>
                                        <span className="text-slate-400">{open ? '−' : '+'}</span>
                                    </div>
                                    {open ? <p className="mt-2 text-sm text-slate-600 theme-dark:text-slate-300">{item.a}</p> : null}
                                </button>
                            )
                        })}
                    </div>
                </motion.section>
            </div>
        </PageFade>
    )
}
