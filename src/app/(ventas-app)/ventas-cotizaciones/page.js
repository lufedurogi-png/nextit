'use client'

const card = 'rounded-2xl border border-violet-100 bg-white shadow-sm dark:border-violet-900/40 dark:bg-[#1a1628]/80 overflow-hidden'

export default function VentasCotizacionesPage() {
    const rows = [
        { id: 'C-2401', cli: 'Tech Norte', st: 'Enviada', tot: '$22,000', due: '12 may 2026' },
        { id: 'C-2398', cli: 'Industrias Delta', st: 'Aceptada', tot: '$11,200', due: '08 may 2026' },
        { id: 'C-2395', cli: 'Grupo Orion', st: 'Borrador', tot: '$33,800', due: '—' },
        { id: 'C-2390', cli: 'Logística Sur', st: 'Vencida', tot: '$6,100', due: '01 may 2026' },
    ]

    const stClass = {
        Enviada: 'bg-sky-100 text-sky-900 dark:bg-sky-900/30 dark:text-sky-100',
        Aceptada: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100',
        Borrador: 'bg-slate-100 text-slate-800 dark:bg-slate-700/40 dark:text-slate-100',
        Vencida: 'bg-rose-100 text-rose-900 dark:bg-rose-900/30 dark:text-rose-100',
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-violet-950 dark:text-white">Cotizaciones</h1>
                    <p className="text-sm text-violet-800/70 dark:text-violet-200/60 mt-1">Seguimiento de propuestas comerciales.</p>
                </div>
            </div>

            <div className={card}>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-sm">
                        <thead>
                            <tr className="bg-violet-50/90 text-left text-xs font-semibold text-violet-900 dark:bg-violet-950/50 dark:text-violet-100">
                                <th className="px-4 py-3">Folio</th>
                                <th className="px-4 py-3">Cliente</th>
                                <th className="px-4 py-3">Estado</th>
                                <th className="px-4 py-3 text-right">Total</th>
                                <th className="px-4 py-3">Vigencia</th>
                                <th className="px-4 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-violet-50 dark:divide-violet-900/30">
                            {rows.map((r) => (
                                <tr key={r.id} className="hover:bg-violet-50/30 dark:hover:bg-white/[0.02]">
                                    <td className="px-4 py-3 font-mono font-semibold text-violet-800 dark:text-violet-200">{r.id}</td>
                                    <td className="px-4 py-3">{r.cli}</td>
                                    <td className="px-4 py-3">
                                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${stClass[r.st]}`}>{r.st}</span>
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium">{r.tot}</td>
                                    <td className="px-4 py-3 text-gray-500 dark:text-violet-300/50">{r.due}</td>
                                    <td className="px-4 py-3 text-right">
                                        <button type="button" className="text-xs font-semibold text-violet-700 underline opacity-50 cursor-not-allowed dark:text-violet-300" disabled>
                                            Ver PDF
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
