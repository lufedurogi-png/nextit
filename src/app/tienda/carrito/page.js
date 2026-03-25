import { Suspense } from 'react'
import CarritoClient from './CarritoClient'

function CarritoFallback() {
    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
            <p className="text-gray-400 text-sm">Cargando carrito…</p>
        </div>
    )
}

export default function PageCarrito() {
    return (
        <Suspense fallback={<CarritoFallback />}>
            <CarritoClient />
        </Suspense>
    )
}
