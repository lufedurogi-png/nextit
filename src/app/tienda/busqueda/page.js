import { Suspense } from 'react'
import { getBusquedaForSSR } from '@/lib/busqueda'
import BusquedaClient from './BusquedaClient'

/**
 * Fallback no nulo: `BusquedaClient` usa `useSearchParams()`. Con `fallback={null}`, Next/React
 * pueden fallar al hidratar el límite Suspense (p. ej. "__webpack_modules__[moduleId] is not a function").
 */
function BusquedaSuspenseFallback() {
    return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 bg-gray-50 dark:bg-tienda-canvas px-4">
            <div className="h-8 w-8 rounded-full border-2 border-[#FF8000] border-t-transparent animate-spin" aria-hidden />
            <p className="text-sm text-gray-600 dark:text-gray-400">Cargando búsqueda…</p>
        </div>
    )
}

/** Búsqueda: datos en servidor para primera pintura al instante; cliente usa initialData y refetch si cambia q. */
export default async function PageBusqueda({ searchParams }) {
    const raw = searchParams?.q
    const q = Array.isArray(raw) ? raw[0] : (typeof raw === 'string' ? raw : '')
    const initialData = await getBusquedaForSSR(q ?? '')
    return (
        <Suspense fallback={<BusquedaSuspenseFallback />}>
            <BusquedaClient initialData={initialData} initialQuery={q ?? ''} />
        </Suspense>
    )
}
