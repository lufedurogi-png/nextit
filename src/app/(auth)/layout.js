'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import BrandLogo from '@/components/BrandLogo'
import {
    getStoredDarkMode,
    applyThemeToDocument,
    persistTheme,
    broadcastThemeChange,
} from '@/lib/appTheme'

const Layout = ({ children }) => {
    const [darkMode, setDarkMode] = useState(null)
    const effectiveDark = darkMode === null ? false : darkMode

    useEffect(() => {
        setDarkMode(getStoredDarkMode())
    }, [])

    useEffect(() => {
        if (darkMode === null) return
        applyThemeToDocument(darkMode)
        persistTheme(darkMode)
        broadcastThemeChange(darkMode)
    }, [darkMode])

    useEffect(() => {
        const onCustom = (e) => {
            if (typeof e.detail === 'boolean') setDarkMode(e.detail)
        }
        const onStorage = (ev) => {
            if (ev.key === 'darkMode' && ev.newValue !== null) {
                try {
                    setDarkMode(JSON.parse(ev.newValue))
                } catch {
                    // ignorar
                }
            }
        }
        window.addEventListener('darkModeChange', onCustom)
        window.addEventListener('storage', onStorage)
        return () => {
            window.removeEventListener('darkModeChange', onCustom)
            window.removeEventListener('storage', onStorage)
        }
    }, [])

    const setTheme = (next) => {
        setDarkMode(next)
    }

    const pill = `inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors ${
        effectiveDark ? 'bg-gray-800/80 text-gray-200 hover:bg-gray-700' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
    }`

    const accentHover = effectiveDark ? 'text-gray-300 hover:text-blue-400' : 'text-gray-700 hover:text-blue-600'

    return (
        <div
            className={`min-h-screen transition-colors duration-300 flex flex-col ${
                effectiveDark ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'
            }`}
        >
            <header
                className={`sticky top-0 z-50 border-b transition-colors duration-300 flex-shrink-0 ${
                    effectiveDark ? 'bg-gray-900/95 backdrop-blur-sm border-gray-800' : 'bg-white/95 backdrop-blur-sm border-gray-200'
                }`}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="hidden md:flex items-center justify-between h-16">
                        <Link href="/" className="flex items-center min-w-0">
                            <BrandLogo dark={effectiveDark} />
                        </Link>
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                                <div className="relative w-5 h-5">
                                    <Image
                                        src="/Imagenes/icon_modo.webp"
                                        alt="Modo"
                                        width={20}
                                        height={20}
                                        className={`object-contain transition-all duration-300 ${
                                            effectiveDark ? 'brightness-0 invert' : ''
                                        }`}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setTheme(!effectiveDark)}
                                    className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                        effectiveDark ? 'bg-blue-600' : 'bg-gray-300'
                                    }`}
                                    aria-label="Cambiar tema claro u oscuro"
                                >
                                    <span
                                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-300 ${
                                            effectiveDark ? 'translate-x-8' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                                <span className={`text-xs font-medium ${effectiveDark ? 'text-blue-300' : 'text-gray-700'}`}>
                                    {effectiveDark ? 'Oscuro' : 'Claro'}
                                </span>
                            </div>
                            <Link href="/" className={`transition-colors font-medium ${accentHover}`}>
                                Inicio
                            </Link>
                            <Link href="/dashboard" className={`transition-colors font-medium ${accentHover}`}>
                                Colección
                            </Link>
                        </div>
                    </div>

                    <div className="md:hidden py-3 space-y-3">
                        <div className="flex justify-center">
                            <Link href="/" className="flex justify-center">
                                <BrandLogo dark={effectiveDark} centered className="max-w-[90vw]" />
                            </Link>
                        </div>
                        <div className={`flex flex-wrap items-center gap-2 ${effectiveDark ? 'text-gray-200' : 'text-gray-800'}`}>
                            <div className={`flex flex-wrap items-center gap-2 ${pill}`}>
                                <Image
                                    src="/Imagenes/icon_modo.webp"
                                    alt=""
                                    width={18}
                                    height={18}
                                    className={`object-contain ${effectiveDark ? 'brightness-0 invert' : ''}`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setTheme(!effectiveDark)}
                                    className={`relative inline-flex h-6 w-12 shrink-0 items-center rounded-full transition-colors ${
                                        effectiveDark ? 'bg-blue-600' : 'bg-gray-300'
                                    }`}
                                    aria-label="Cambiar tema"
                                >
                                    <span
                                        className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                                            effectiveDark ? 'translate-x-7' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                                <span className="text-xs font-medium">{effectiveDark ? 'Oscuro' : 'Claro'}</span>
                            </div>
                            <Link href="/" className={pill}>
                                Inicio
                            </Link>
                            <Link href="/dashboard" className={pill}>
                                Colección
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 flex flex-col relative min-h-0 min-h-[calc(100vh-8rem)] md:min-h-[calc(100vh-4rem)]">
                {children}
            </main>

            <footer
                className={`border-t transition-colors duration-300 flex-shrink-0 mt-auto ${
                    effectiveDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
                }`}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="relative w-8 h-8">
                                    <Image
                                        src="/Imagenes/icon_contacto.png"
                                        alt="Contacto"
                                        fill
                                        className={`object-contain ${effectiveDark ? 'brightness-0 invert' : ''}`}
                                    />
                                </div>
                                <h3 className={`text-xl font-bold ${effectiveDark ? 'text-white' : 'text-gray-900'}`}>
                                    Contáctanos
                                </h3>
                            </div>
                            <div className={`space-y-2 ${effectiveDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">333 616-7279</p>
                                <p className="text-base">desarrollo@nxt.it.com</p>
                                <p className="text-sm leading-relaxed">
                                    Av. Lopez Mateos #1038-11, Col Italia Providencia CP 44630
                                    <br />
                                    Jalisco, Guadalajara
                                </p>
                            </div>
                        </div>

                        <div>
                            <h3 className={`text-lg font-semibold mb-4 ${effectiveDark ? 'text-white' : 'text-gray-900'}`}>
                                Sobre nosotros
                            </h3>
                            <p className={`text-sm leading-relaxed ${effectiveDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                Fundada en 2009 como Arrcuss Comercial de S de RL de CV, ahora NXT.IT, nació como un proyecto
                                emprendedor para democratizar la creciente necesidad por equipo de cómputo y electrónica de las
                                PYMES.
                            </p>
                        </div>

                        <div>
                            <h3 className={`text-lg font-semibold mb-4 ${effectiveDark ? 'text-white' : 'text-gray-900'}`}>
                                Información
                            </h3>
                            <div className={`space-y-2 text-sm ${effectiveDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                <p>
                                    <span className="font-semibold">Misión:</span> Incrementar las capacidades de nuestros
                                    clientes mediante innovadoras soluciones de software, hardware y tecnología de consumo.
                                </p>
                                <p>
                                    <span className="font-semibold">Visión:</span> Ser una empresa reconocida por su liderazgo
                                    en el mercado de Tecnologías de la Información.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div
                        className={`mt-8 pt-8 border-t text-center text-sm ${
                            effectiveDark ? 'border-gray-800 text-gray-400' : 'border-gray-200 text-gray-600'
                        }`}
                    >
                        <p>&copy; {new Date().getFullYear()} NXT.IT. Todos los derechos reservados.</p>
                    </div>
                </div>
            </footer>
        </div>
    )
}

export default Layout
