'use client'

const card = 'rounded-2xl border border-violet-100 bg-white p-5 shadow-sm dark:border-violet-900/40 dark:bg-[#1a1628]/80'

export default function VentasEquipoPage() {
    const members = [
        { n: 'María López', r: 'Líder comercial', meta: '$180k', log: '112%', z: 'Norte' },
        { n: 'Carlos Ruiz', r: 'Ejecutivo de cuenta', meta: '$120k', log: '94%', z: 'Centro' },
        { n: 'Elena Vargas', r: 'Inside sales', meta: '$85k', log: '101%', z: 'Sur' },
        { n: 'Diego Mena', r: 'Soporte preventa', meta: '—', log: '—', z: 'Remoto' },
    ]

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-violet-950 dark:text-white">Equipo</h1>
                <p className="text-sm text-violet-800/70 dark:text-violet-200/60 mt-1">Metas del mes y zona de cobertura.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                {members.map((m) => (
                    <div key={m.n} className={card}>
                        <div className="flex items-start gap-4">
                            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#5b4d7a] to-[#8b7cb8] text-white font-bold text-lg flex items-center justify-center shrink-0">
                                {m.n.charAt(0)}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold text-gray-900 dark:text-white">{m.n}</p>
                                <p className="text-sm text-violet-700 dark:text-violet-300/80">{m.r}</p>
                                <p className="text-xs text-gray-500 dark:text-violet-300/50 mt-2">Zona: {m.z}</p>
                            </div>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-violet-100 pt-4 dark:border-violet-900/40">
                            <div>
                                <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-violet-300/50">Meta</p>
                                <p className="font-semibold text-violet-900 dark:text-violet-100">{m.meta}</p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-violet-300/50">Avance</p>
                                <p className="font-semibold text-emerald-700 dark:text-emerald-400">{m.log}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className={card}>
                <h2 className="font-semibold text-gray-900 dark:text-white mb-2">Objetivo regional</h2>
                <p className="text-sm text-gray-600 dark:text-violet-200/70">
                    Las metas se distribuyen por zona y se revisan en la reunión semanal de pipeline.
                </p>
            </div>
        </div>
    )
}
