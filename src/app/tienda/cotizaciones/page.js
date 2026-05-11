import { Suspense } from 'react'
import CotizacionesClient from './CotizacionesClient'

function CotizacionesFallback() {
    return (
        <div className="min-h-screen bg-tienda-canvas text-gray-100 flex items-center justify-center">
            <p className="text-gray-400 text-sm">Cargando cotizaciones…</p>
        </div>
    )
}

export default function PageCotizaciones() {
    return (
        <Suspense fallback={<CotizacionesFallback />}>
            <CotizacionesClient />
        </Suspense>
    )
}
