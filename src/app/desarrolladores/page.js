'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import useSWR from 'swr'
import TiendaNavHeader from '@/components/TiendaNavHeader'
import { swrFetcher } from '@/lib/swrFetcher'
import { resolvePublicidadUrl } from '@/lib/publicidad'

export default function DesarrolladoresPage() {
    // Modo oscuro: solo reflejamos el estado global (tienda), no lo forzamos
    const [darkMode, setDarkMode] = useState(false)

    // Sincronizar con preferencia ya guardada (tienda) y con la clase del <html>
    useEffect(() => {
        if (typeof window === 'undefined') return
        const saved = localStorage.getItem('darkMode')
        const isDark =
            saved !== null ? Boolean(JSON.parse(saved)) : document.documentElement.classList.contains('dark')

        setDarkMode(isDark)
        if (isDark) {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }, [])

    // Escuchar cambios de modo disparados desde el header / otras vistas
    useEffect(() => {
        if (typeof window === 'undefined') return

        const handleStorage = (e) => {
            if (e.key === 'darkMode' && e.newValue != null) {
                const isDark = Boolean(JSON.parse(e.newValue))
                setDarkMode(isDark)
                if (isDark) {
                    document.documentElement.classList.add('dark')
                } else {
                    document.documentElement.classList.remove('dark')
                }
            }
        }

        const handleCustom = (e) => {
            const isDark = Boolean(e.detail)
            setDarkMode(isDark)
            if (isDark) {
                document.documentElement.classList.add('dark')
            } else {
                document.documentElement.classList.remove('dark')
            }
        }

        window.addEventListener('storage', handleStorage)
        window.addEventListener('darkModeChange', handleCustom)
        return () => {
            window.removeEventListener('storage', handleStorage)
            window.removeEventListener('darkModeChange', handleCustom)
        }
    }, [])

    const { data: devs = [] } = useSWR('/desarrolladores', swrFetcher, {
        revalidateOnFocus: false,
        dedupingInterval: 10000,
    })

    const bg = darkMode ? 'bg-tienda-canvas text-gray-100' : 'bg-gray-50 text-gray-900'
    const sectionBg = darkMode ? 'from-tienda-canvas via-gray-900 to-tienda-canvas' : 'from-white via-gray-50 to-white'
    const cardBorder = darkMode ? 'border-gray-700 bg-tienda-canvas' : 'border-gray-200 bg-white'
    const chipBorder = darkMode ? 'border-gray-700 bg-tienda-canvas/80 text-gray-200' : 'border-gray-200 bg-white text-gray-700'
    const textMuted = darkMode ? 'text-gray-300' : 'text-gray-600'

    const fechaRango = (inicio, fin) => {
        const format = (v) => {
            if (!v) return null
            const d = new Date(`${v}T00:00:00`)
            if (Number.isNaN(d.getTime())) return null
            return d.toLocaleDateString('es-MX', { year: 'numeric', month: 'short' })
        }
        const a = format(inicio)
        const b = format(fin)
        if (a && b) return `${a} - ${b}`
        if (a) return `${a} - Actual`
        if (b) return `Hasta ${b}`
        return 'Periodo no especificado'
    }

    return (
        <div className={`min-h-screen transition-colors duration-300 ${bg}`}>
            {/* Header de tienda reutilizado, incluye interruptor de modo */}
            <TiendaNavHeader darkMode={darkMode} setDarkMode={setDarkMode} />

            <main className="pt-6 pb-16">
                <section className={`relative border-b border-gray-800/60 bg-gradient-to-b ${sectionBg}`}>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(248,250,252,0.08)_0,_transparent_55%),radial-gradient(circle_at_bottom,_rgba(251,146,60,0.18)_0,_transparent_60%)] pointer-events-none" />
                    <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
                        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#FF8000]">
                            Nuestro equipo
                        </p>
                        <h1 className="mt-3 text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight">
                            Página de{' '}
                            <span className="text-[#FF8000]">
                                desarrolladores
                            </span>
                        </h1>
                        <p className={`mt-4 max-w-2xl text-sm sm:text-base ${textMuted}`}>
                            Un espacio para reconocer a las personas detrás del código, las integraciones y las ideas
                            que hacen posible esta plataforma.
                        </p>
                        <div
                            className={`mt-6 inline-flex items-center gap-3 rounded-full border px-4 py-1.5 text-xs shadow-sm ${chipBorder}`}
                        >
                            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span>Integrantes registrados: {Array.isArray(devs) ? devs.length : 0}</span>
                        </div>
                        <div className="mt-4 text-xs text-[#FF8000] font-medium">
                            <Link href="/" className="inline-flex items-center gap-1 hover:underline">
                                <span aria-hidden>←</span>
                                <span>Regresar a la tienda</span>
                            </Link>
                        </div>
                    </div>
                </section>

                <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
                    <div className="text-center space-y-2 mb-8">
                        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#FF8000]">
                            Equipo de desarrollo
                        </p>
                        <h2 className="text-xl sm:text-2xl font-semibold">
                            Personas que han construido la plataforma
                        </h2>
                    </div>

                    {devs.length === 0 ? (
                        <div className={`rounded-3xl border p-8 text-center ${cardBorder}`}>
                            <p className={textMuted}>Aun no hay integrantes registrados.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                            {devs.map((dev, idx) => {
                                const left = idx % 2 === 0
                                const roleColor = left ? 'text-orange-500/90' : 'text-sky-400/90'
                                return (
                                    <article key={dev.id} className={`rounded-3xl border p-6 sm:p-7 shadow-lg ${cardBorder}`}>
                                        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
                                            <div className="relative mx-auto h-24 w-24 sm:h-28 sm:w-28 rounded-2xl overflow-hidden border border-gray-700 shadow-[0_10px_35px_rgba(0,0,0,0.45)] bg-black/20 shrink-0">
                                                <img
                                                    src={resolvePublicidadUrl(dev.foto_url)}
                                                    alt={`Foto de ${dev.nombre}`}
                                                    className="h-full w-full object-cover"
                                                />
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <p className={`text-[0.7rem] font-semibold uppercase tracking-[0.22em] ${roleColor}`}>
                                                    {dev.rol}
                                                </p>
                                                <h3 className="text-lg sm:text-xl font-semibold">
                                                    {dev.nombre}
                                                </h3>
                                                <p className={`text-sm leading-relaxed ${textMuted}`}>
                                                    {dev.descripcion}
                                                </p>
                                                <p className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                    {fechaRango(dev.fecha_inicio, dev.fecha_fin)}
                                                </p>
                                            </div>
                                        </div>
                                    </article>
                                )
                            })}
                        </div>
                    )}
                </section>
            </main>
        </div>
    )
}

