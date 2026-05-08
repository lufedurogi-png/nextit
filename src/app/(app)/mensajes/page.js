'use client'

import { Suspense } from 'react'
import MensajesInner from './MensajesInner'

function MensajesFallback() {
    return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 px-4 text-center">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-[var(--app-accent)] border-t-transparent" aria-hidden />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Cargando mensajes…</p>
        </div>
    )
}

export default function MensajesPage() {
    return (
        <Suspense fallback={<MensajesFallback />}>
            <MensajesInner />
        </Suspense>
    )
}
