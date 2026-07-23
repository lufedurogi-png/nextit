import { IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google'
import { PortafolioThemeProvider } from '@/components/portafolio/PortafolioTheme'
import './portafolio.css'

const plexSans = IBM_Plex_Sans({
    subsets: ['latin'],
    weight: ['300', '400', '500', '600'],
    display: 'swap',
    variable: '--font-pf-sans',
})

const plexMono = IBM_Plex_Mono({
    subsets: ['latin'],
    weight: ['400', '500'],
    display: 'swap',
    variable: '--font-pf-mono',
})

export const metadata = {
    title: 'Fernando Durán — Portafolio',
    description:
        'Fernando Durán — ingeniería de software, e-commerce, productos digitales y sistemas a medida. Guadalajara, México.',
    robots: {
        index: false,
        follow: false,
    },
}

/** Evita flash de tema incorrecto leyendo localStorage antes del paint. */
const themeBootScript = `(function(){try{var k='portafolio-theme';var t=localStorage.getItem(k);if(t!=='light'&&t!=='dark')t='dark';var el=document.currentScript&&document.currentScript.parentElement;if(el)el.setAttribute('data-theme',t);}catch(e){}})();`

export default function PortafolioLayout({ children }) {
    return (
        <div
            className={`pf ${plexSans.variable} ${plexMono.variable} min-h-screen`}
            data-portafolio-root
            data-theme="dark"
            suppressHydrationWarning>
            <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
            <PortafolioThemeProvider>{children}</PortafolioThemeProvider>
        </div>
    )
}
