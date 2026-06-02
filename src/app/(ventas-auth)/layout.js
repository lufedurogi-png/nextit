'use client'

import Link from 'next/link'
import Image from 'next/image'
import ThemeToggle from '@/components/ThemeToggle'
import { AdminThemeProvider, useAdminTheme } from '@/contexts/AdminThemeContext'

function LayoutContent({ children }) {
    const { darkMode, setDarkMode } = useAdminTheme()

    const pill = `inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors ${
        darkMode ? 'bg-[#333333]/90 text-orange-100/90 hover:bg-[#404040]' : 'bg-orange-50 text-orange-900 hover:bg-orange-100'
    }`

    return (
        <div
            className={`min-h-screen transition-colors duration-300 flex flex-col ${
                darkMode ? 'bg-[#1c1c1c] text-gray-100' : 'bg-[#fafafa] text-gray-900'
            }`}
        >
            <header
                className={`sticky top-0 z-50 border-b flex-shrink-0 ${
                    darkMode ? 'bg-[#1c1c1c]/95 backdrop-blur-sm border-orange-950/40' : 'bg-white/95 backdrop-blur-sm border-orange-100'
                }`}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="hidden md:flex items-center justify-between h-16">
                        <Link href="/" className="flex items-center gap-2">
                            <Image src="/Imagenes/logo_en.png" alt="NXT.IT" width={120} height={40} className="h-8 w-auto" />
                            <span className="text-xs font-semibold uppercase tracking-wider text-orange-500/90">Ventas</span>
                        </Link>
                        <ThemeToggle variant="brand" dark={darkMode} onToggle={() => setDarkMode((d) => !d)} />
                    </div>

                    <div className="md:hidden py-3 space-y-3">
                        <div className="flex justify-center">
                            <Link href="/" className="flex items-center">
                                <Image src="/Imagenes/logo_en.png" alt="NXT.IT" width={110} height={36} className="h-8 w-auto" />
                            </Link>
                        </div>
                        <div className={`flex flex-wrap items-center justify-center gap-2 ${darkMode ? 'text-orange-100' : 'text-orange-950'}`}>
                            <div className={`flex flex-wrap items-center gap-2 ${pill}`}>
                                <span className="text-xs font-medium">Tema</span>
                                <ThemeToggle variant="brand" dark={darkMode} onToggle={() => setDarkMode((d) => !d)} />
                            </div>
                            <Link href="/" className={pill}>
                                Inicio
                            </Link>
                        </div>
                    </div>
                </div>
            </header>
            <main className="flex-1 flex flex-col min-h-[calc(100vh-8rem)] md:min-h-[calc(100vh-4rem)]">{children}</main>
        </div>
    )
}

export default function VentasAuthLayout({ children }) {
    return (
        <AdminThemeProvider storageKey="ventas_dark_mode">
            <LayoutContent>{children}</LayoutContent>
        </AdminThemeProvider>
    )
}
