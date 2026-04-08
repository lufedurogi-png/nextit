import { Suspense } from 'react'
import ScanClient from './ScanClient'

export default function ScanPage() {
    return (
        <Suspense
            fallback={
                <div className="max-w-2xl mx-auto px-4 py-8 text-sm text-slate-600 app-bg-pattern min-h-[40vh] flex items-center justify-center">
                    Cargando…
                </div>
            }
        >
            <ScanClient />
        </Suspense>
    )
}
