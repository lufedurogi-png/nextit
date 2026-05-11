import { Nunito, Playfair_Display, VT323 } from 'next/font/google'
import '@/app/global.css'

const nunitoFont = Nunito({
    subsets: ['latin'],
    display: 'swap',
})

const playfairDisplay = Playfair_Display({
    subsets: ['latin'],
    weight: ['400', '600', '700'],
    display: 'swap',
    variable: '--font-playfair',
})

const vt323 = VT323({
    subsets: ['latin'],
    weight: ['400'],
    display: 'swap',
    variable: '--font-vt323',
})

const RootLayout = ({ children }) => {
    return (
        <html
            lang="es"
            suppressHydrationWarning
            className={`${nunitoFont.className} ${playfairDisplay.variable} ${vt323.variable}`}
        >
            <body className="antialiased bg-gray-50 text-gray-900 dark:bg-tienda-canvas dark:text-gray-100 w-full overflow-x-hidden" suppressHydrationWarning>
                {children}
            </body>
        </html>
    )
}

export const metadata = {
    title: 'Todo para oficina',
    icons: {
        icon: '/Imagenes/icon_logo_todoparalaoficina.jpeg',
        shortcut: '/Imagenes/icon_logo_todoparalaoficina.jpeg',
        apple: '/Imagenes/icon_logo_todoparalaoficina.jpeg',
    },
}

export const viewport = {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
}

export default RootLayout
