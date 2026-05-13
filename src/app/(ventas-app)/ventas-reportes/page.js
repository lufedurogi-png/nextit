'use client'

const card = 'rounded-2xl border border-violet-100 bg-white p-5 shadow-sm dark:border-violet-900/40 dark:bg-[#1a1628]/80'

export default function VentasReportesPage() {
    const series = [
        { label: 'Ingresos facturados', cur: '$412,800', prev: '$368,200', pct: 12 },
        { label: 'Tasa de cierre', cur: '31%', prev: '27%', pct: 4 },
        { label: 'Ciclo medio (días)', cur: '42', prev: '51', pct: -18 },
        { label: 'Nuevos leads', cur: '148', prev: '132', pct: 12 },
    ]

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-violet-950 dark:text-white">Reportes</h1>
                <p className="text-sm text-violet-800/70 dark:text-violet-200/60 mt-1">Comparativo del periodo seleccionado.</p>
            </div>

            <div className="flex flex-wrap gap-2">
                <button type="button" className="rounded-full bg-violet-600 px-4 py-1.5 text-xs font-semibold text-white">
                    Mes
                </button>
                <button type="button" className="rounded-full border border-violet-200 px-4 py-1.5 text-xs font-medium text-violet-800 dark:border-violet-700 dark:text-violet-200">
                    Trimestre
                </button>
                <button type="button" className="rounded-full border border-violet-200 px-4 py-1.5 text-xs font-medium text-violet-800 dark:border-violet-700 dark:text-violet-200">
                    Año
                </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                {series.map((s) => (
                    <div key={s.label} className={card}>
                        <p className="text-xs font-medium uppercase tracking-wide text-violet-600/80 dark:text-violet-300/80">{s.label}</p>
                        <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{s.cur}</p>
                        <p className="text-xs text-gray-500 dark:text-violet-300/50 mt-1">Periodo anterior: {s.prev}</p>
                        <p className={`mt-2 text-sm font-semibold ${s.pct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {s.pct >= 0 ? '+' : ''}
                            {s.pct}% vs. anterior
                        </p>
                        <div className="mt-4 h-2 rounded-full bg-violet-100 dark:bg-violet-950/60 overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-[#5b4d7a] to-[#9b8ac8]"
                                style={{ width: `${Math.min(100, Math.abs(s.pct) * 3 + 40)}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            <div className={card}>
                <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Ventas por vendedor</h2>
                <div className="space-y-3">
                    {[
                        ['María López', 92],
                        ['Carlos Ruiz', 78],
                        ['Elena Vargas', 64],
                    ].map(([name, w]) => (
                        <div key={name}>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-700 dark:text-violet-200/90">{name}</span>
                                <span className="font-medium text-violet-800 dark:text-violet-200">{w}%</span>
                            </div>
                            <div className="h-2 rounded-full bg-violet-100 dark:bg-violet-950/60">
                                <div className="h-full rounded-full bg-violet-500 dark:bg-violet-400" style={{ width: `${w}%` }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
