'use client'

import Link from 'next/link'
import Image from 'next/image'
import ThemeToggle from '@/components/ThemeToggle'
import { AdminThemeProvider, useAdminTheme } from '@/contexts/AdminThemeContext'

function LayoutContent({ children }) {
    const { darkMode, setDarkMode } = useAdminTheme()

    const pill = `inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors ${
        darkMode ? 'bg-[#2a2540]/90 text-violet-100/90 hover:bg-[#352d4d]' : 'bg-violet-50 text-violet-900 hover:bg-violet-100'
    }`

    return (
        <div
            className={`min-h-screen transition-colors duration-300 flex flex-col ${
                darkMode ? 'bg-[#16131f] text-gray-100' : 'bg-[#f7f5fc] text-gray-900'
            }`}
        >
            <header
                className={`sticky top-0 z-50 border-b flex-shrink-0 ${
                    darkMode ? 'bg-[#16131f]/95 backdrop-blur-sm border-violet-950/40' : 'bg-white/95 backdrop-blur-sm border-violet-100'
                }`}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="hidden md:flex items-center justify-between h-16">
                        <Link href="/" className="flex items-center gap-2">
                            <Image src="/Imagenes/logo_en.png" alt="NXT.IT" width={120} height={40} className="h-8 w-auto" />
                            <span className="text-xs font-semibold uppercase tracking-wider text-violet-500/90">Ventas</span>
                        </Link>
                        <ThemeToggle dark={darkMode} onToggle={() => setDarkMode((d) => !d)} />
                    </div>

                    <div className="md:hidden py-3 space-y-3">
                        <div className="flex justify-center">
                            <Link href="/" className="flex items-center">
                                <Image src="/Imagenes/logo_en.png" alt="NXT.IT" width={110} height={36} className="h-8 w-auto" />
                            </Link>
                        </div>
                        <div className={`flex flex-wrap items-center justify-center gap-2 ${darkMode ? 'text-violet-100' : 'text-violet-950'}`}>
                            <div className={`flex flex-wrap items-center gap-2 ${pill}`}>
                                <span className="text-xs font-medium">Tema</span>
                                <ThemeToggle dark={darkMode} onToggle={() => setDarkMode((d) => !d)} />
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
        <AdminThemeProvider>
            <LayoutContent>{children}</LayoutContent>
        </AdminThemeProvider>
    )
}
