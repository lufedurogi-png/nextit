'use client'

const col =
    'flex min-h-[420px] min-w-[260px] flex-1 flex-col rounded-2xl border border-violet-100 bg-violet-50/30 dark:border-violet-900/40 dark:bg-[#1a1628]/60'

const deal =
    'rounded-xl border border-violet-100 bg-white p-3 shadow-sm dark:border-violet-800/50 dark:bg-[#221c36] cursor-default'

export default function VentasPipelinePage() {
    const stages = [
        {
            title: 'Calificación',
            sum: '$42,000 · 5',
            items: [
                { t: 'Renovación licencias', c: 'Industrias Delta', v: '$12,400', st: 'ok' },
                { t: 'Equipo de red', c: 'Tech Norte', v: '$8,900', st: 'warn' },
            ],
        },
        {
            title: 'Contacto establecido',
            sum: '$28,500 · 4',
            items: [
                { t: 'Soporte anual', c: 'Grupo Orion', v: '$15,200', st: 'ok' },
                { t: 'Stock almacén', c: 'Logística Sur', v: '$6,100', st: 'risk' },
            ],
        },
        {
            title: 'Propuesta enviada',
            sum: '$51,200 · 6',
            items: [
                { t: 'Cotización C-2401', c: 'Ana Ruiz', v: '$22,000', st: 'warn' },
                { t: 'Hardware Q2', c: 'Luis Mora', v: '$18,500', st: 'ok' },
            ],
        },
        {
            title: 'Negociación',
            sum: '$33,800 · 3',
            items: [{ t: 'Descuento volumen', c: 'Carmen Vega', v: '$33,800', st: 'risk' }],
        },
        {
            title: 'Ganado',
            sum: '$19,400 · 2',
            items: [
                { t: 'Pedido #4821', c: 'Industrias Delta', v: '$11,200', st: 'ok' },
                { t: 'Pedido #4810', c: 'Tech Norte', v: '$8,200', st: 'ok' },
            ],
        },
    ]

    const dot = {
        ok: 'bg-emerald-400',
        warn: 'bg-amber-400',
        risk: 'bg-rose-400',
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-violet-950 dark:text-white">Pipeline</h1>
                    <p className="text-sm text-violet-800/70 dark:text-violet-200/60 mt-1">Oportunidades por etapa del embudo.</p>
                </div>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-2">
                {stages.map((s) => (
                    <div key={s.title} className={col}>
                        <div className="sticky top-0 z-10 border-b border-violet-100/80 bg-violet-50/80 px-3 py-3 dark:border-violet-900/50 dark:bg-[#1f1930]/95">
                            <h2 className="font-semibold text-gray-900 dark:text-white">{s.title}</h2>
                            <p className="text-xs text-violet-700/80 dark:text-violet-300/70 mt-0.5">{s.sum}</p>
                        </div>
                        <div className="flex flex-1 flex-col gap-2 p-2">
                            {s.items.map((it) => (
                                <div key={it.t} className={deal}>
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="font-medium text-sm text-gray-900 dark:text-white leading-snug">{it.t}</p>
                                        <span className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${dot[it.st]}`} title="Prioridad / riesgo" />
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-violet-300/60 mt-1">{it.c}</p>
                                    <p className="text-xs font-semibold text-violet-700 dark:text-violet-200 mt-2">{it.v}</p>
                                </div>
                            ))}
                            <button
                                type="button"
                                className="mt-auto rounded-lg border border-dashed border-violet-200 py-2 text-xs text-violet-600 hover:bg-white/80 dark:border-violet-700 dark:text-violet-300 dark:hover:bg-white/5"
                            >
                                + Añadir oportunidad
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
