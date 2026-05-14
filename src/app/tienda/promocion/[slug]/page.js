import { Suspense } from 'react'
import { getServerBackendApiBase } from '@/lib/serverBackendUrl'
import PromocionTiendaClient from './PromocionTiendaClient'

async function fetchPromocion(slug) {
    const base = getServerBackendApiBase()
    if (!base) return null
    try {
        const res = await fetch(`${base}/promociones/${encodeURIComponent(slug)}`, { next: { revalidate: 60 } })
        const json = await res.json()
        if (res.ok && json?.success && json?.data) return json.data
    } catch {
        // ignore
    }
    return null
}

export default async function PromocionPage({ params }) {
    const slugRaw = params?.slug ?? ''
    const slug = slugRaw ? decodeURIComponent(slugRaw) : ''
    const initialData = slug ? await fetchPromocion(slug) : null

    return (
        <Suspense fallback={<div className="min-h-screen bg-tienda-canvas" />}>
            <PromocionTiendaClient slug={slug} initialData={initialData} />
        </Suspense>
    )
}
