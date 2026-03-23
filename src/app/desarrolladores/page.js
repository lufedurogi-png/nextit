'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import TiendaNavHeader from '@/components/TiendaNavHeader'

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

    const bg = darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'
    const sectionBg = darkMode ? 'from-gray-900 via-gray-900 to-gray-900' : 'from-white via-gray-50 to-white'
    const cardBorder = darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'
    const chipBorder = darkMode ? 'border-gray-700 bg-gray-900/80 text-gray-200' : 'border-gray-200 bg-white text-gray-700'
    const textMuted = darkMode ? 'text-gray-300' : 'text-gray-600'

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
                            <span>Última actualización: 17/03/2026</span>
                        </div>
                        <div className="mt-4 text-xs text-[#FF8000] font-medium">
                            <Link href="/tienda" className="inline-flex items-center gap-1 hover:underline">
                                <span aria-hidden>←</span>
                                <span>Regresar a la tienda</span>
                            </Link>
                        </div>
                    </div>
                </section>

                <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-12 sm:space-y-16">
                    {/* Nivel 1: Dirección general y líder técnico (tope del organigrama) */}
                    <div className="space-y-6">
                        <div className="text-center space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#FF8000]">
                                Dirección del proyecto
                            </p>
                            <h2 className="text-xl sm:text-2xl font-semibold">
                                Organigrama del proyecto de tienda en línea
                            </h2>
                            <p className={`text-sm sm:text-base max-w-2xl mx-auto ${textMuted}`}>
                                Una vista rápida de cómo se organiza el equipo clave que impulsa la plataforma:
                                dirección general, liderazgo técnico y desarrollo.
                            </p>
                        </div>

                        <div className="flex flex-col md:flex-row md:items-stretch gap-6 md:gap-8 justify-center">
                            {/* CEO */}
                            <div className={`flex-1 rounded-3xl border p-6 sm:p-7 shadow-lg ${cardBorder}`}>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                                    <div className="relative mx-auto h-24 w-24 sm:h-28 sm:w-28 rounded-2xl overflow-hidden border border-gray-700 shadow-[0_10px_35px_rgba(0,0,0,1)] bg-black/40">
                                        <Image
                                            src="/Imagenes/caja.png"
                                            alt="Foto de Lic. José Luis Arregui Cussi"
                                            fill
                                            sizes="7rem"
                                            className="object-contain p-3"
                                            priority
                                        />
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-orange-500/90">
                                            Dirección general
                                        </p>
                                        <h3 className="text-lg sm:text-xl font-semibold">
                                            Lic. José Luis Arregui Cussi
                                        </h3>
                                        <p className={`text-sm leading-relaxed ${textMuted}`}>
                                            Responsable de las decisiones estratégicas de la empresa y de marcar la
                                            visión a largo plazo del proyecto de la tienda en línea.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Líder técnico */}
                            <div className={`flex-1 rounded-3xl border p-6 sm:p-7 shadow-lg ${cardBorder}`}>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                                    <div className="relative mx-auto h-24 w-24 sm:h-28 sm:w-28 rounded-2xl overflow-hidden border border-gray-700 shadow-[0_10px_35px_rgba(0,0,0,1)] bg-black/40">
                                        <Image
                                            src="/Imagenes/ing_Carlos.jpeg"
                                            alt="Foto de Ing. Carlos Arnulfo Preciado Rodríguez"
                                            fill
                                            sizes="7rem"
                                            className="object-contain p-3"
                                            priority
                                        />
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-sky-400/90">
                                            Líder técnico
                                        </p>
                                        <h3 className="text-lg sm:text-xl font-semibold">
                                            Ing. Carlos Arnulfo Preciado Rodríguez
                                        </h3>
                                        <p className={`text-sm leading-relaxed ${textMuted}`}>
                                            Encargado de coordinar el diseño técnico, la arquitectura y la implementación
                                            del proyecto de la tienda en línea en su nivel operativo.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Conector visual hacia el siguiente nivel del organigrama */}
                        <div className="flex justify-center" aria-hidden="true">
                            <div className="flex flex-col items-center gap-2">
                                <div className="h-5 w-px bg-gradient-to-b from-transparent via-gray-500/70 to-transparent" />
                                <div className="flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.25em] text-gray-400">
                                    <span className="h-px w-6 bg-gray-500/60" />
                                    <span>Equipo de desarrollo</span>
                                    <span className="h-px w-6 bg-gray-500/60" />
                                </div>
                                <div className="h-5 w-px bg-gradient-to-b from-transparent via-gray-500/70 to-transparent" />
                            </div>
                        </div>
                    </div>

                    {/* Nivel 2: Equipo de desarrollo (cartas más compactas) */}
                    <div className="flex flex-col md:flex-row md:items-stretch gap-6 md:gap-8 justify-center">
                        {/* Arturo */}
                        <div className={`flex-1 rounded-3xl border p-6 sm:p-7 shadow-lg ${cardBorder}`}>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                                <div className="relative mx-auto h-24 w-24 sm:h-28 sm:w-28 rounded-2xl overflow-hidden border border-gray-700 shadow-[0_10px_35px_rgba(0,0,0,1)]">
                                    <Image
                                        src="/Imagenes/ing_Arturo.jpeg"
                                        alt="Foto de Arturo Rivera Cervantes"
                                        fill
                                        sizes="7rem"
                                        className="object-cover"
                                        priority
                                    />
                                </div>
                                <div className="flex-1 space-y-2">
                                    <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-orange-500/90">
                                        Desarrollo backend
                                    </p>
                                    <h3 className="text-lg sm:text-xl font-semibold">
                                        Arturo Rivera Cervantes
                                    </h3>
                                    <p className={`text-sm leading-relaxed ${textMuted}`}>
                                        Focado en la lógica de negocio, servicios y conectores que mantienen viva la
                                        tienda y sus integraciones.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Fernando */}
                        <div className={`flex-1 rounded-3xl border p-6 sm:p-7 shadow-lg ${cardBorder}`}>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                                <div className="relative mx-auto h-24 w-24 sm:h-28 sm:w-28 rounded-2xl overflow-hidden border border-gray-700 shadow-[0_10px_35px_rgba(0,0,0,1)]">
                                    <Image
                                        src="/Imagenes/ing_Fernando.jpeg"
                                        alt="Foto de Fernando Durán"
                                        fill
                                        sizes="7rem"
                                        className="object-cover"
                                        priority
                                    />
                                </div>
                                <div className="flex-1 space-y-2">
                                    <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-sky-400/90">
                                        Diseño y experiencia
                                    </p>
                                    <h3 className="text-lg sm:text-xl font-semibold">
                                        Fernando Durán
                                    </h3>
                                    <p className={`text-sm leading-relaxed ${textMuted}`}>
                                        Centrado en que las vistas y componentes se vean claros, consistentes y fáciles
                                        de usar para las personas que navegan la tienda.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    )
}

