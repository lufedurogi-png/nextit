'use client'

import Link from 'next/link'
import ThemeToggle from '@/components/ThemeToggle'
import BrandLogo from '@/components/BrandLogo'
import { AdminThemeProvider, useAdminTheme } from './AdminThemeContext'

function LayoutContent({ children }) {
    const { darkMode, setDarkMode } = useAdminTheme()

    const pill = `inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors ${
        darkMode ? 'bg-gray-800/80 text-gray-200 hover:bg-gray-700' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
    }`

    return (
        <div className={`min-h-screen transition-colors duration-300 flex flex-col ${
            darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'
        }`}>
            <header className={`sticky top-0 z-50 border-b flex-shrink-0 ${
                darkMode ? 'bg-gray-900/95 backdrop-blur-sm border-gray-800' : 'bg-white/95 backdrop-blur-sm border-gray-200'
            }`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="hidden md:flex items-center justify-between h-16">
                        <Link href="/" className="flex items-center min-w-0">
                            <BrandLogo dark={darkMode} />
                        </Link>
                        <ThemeToggle dark={darkMode} onToggle={() => setDarkMode((d) => !d)} />
                    </div>

                    <div className="md:hidden py-3 space-y-3">
                        <div className="flex justify-center">
                            <Link href="/" className="flex justify-center">
                                <BrandLogo dark={darkMode} centered className="max-w-[90vw]" />
                            </Link>
                        </div>
                        <div className={`flex flex-wrap items-center gap-2 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
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

const Layout = ({ children }) => (
    <AdminThemeProvider>
        <LayoutContent>{children}</LayoutContent>
    </AdminThemeProvider>
)

export default Layout
