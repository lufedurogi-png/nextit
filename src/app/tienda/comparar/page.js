import { Suspense } from 'react'
import CompararClient from './CompararClient'

function CompararFallback() {
    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
            <p className="text-gray-400 text-sm">Cargando comparador…</p>
        </div>
    )
}

export default function PageComparar() {
    return (
        <Suspense fallback={<CompararFallback />}>
            <CompararClient />
        </Suspense>
    )
}
