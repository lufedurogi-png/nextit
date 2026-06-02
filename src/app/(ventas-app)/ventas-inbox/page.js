'use client'

import { Suspense } from 'react'
import VentasInboxClient from '@/components/ventas/VentasInboxClient'

export default function VentasInboxPage() {
    return (
        <Suspense fallback={<p className="text-sm text-orange-600 dark:text-orange-300/70">Cargando bandeja…</p>}>
            <VentasInboxClient />
        </Suspense>
    )
}
