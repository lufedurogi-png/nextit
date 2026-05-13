'use client'

const card = 'rounded-2xl border border-violet-100 bg-white shadow-sm dark:border-violet-900/40 dark:bg-[#1a1628]/80'

const badges = {
    'Por hacer': 'bg-slate-100 text-slate-800 dark:bg-slate-700/40 dark:text-slate-100',
    'En curso': 'bg-sky-100 text-sky-900 dark:bg-sky-900/30 dark:text-sky-100',
    Esperando: 'bg-amber-100 text-amber-900 dark:bg-amber-900/25 dark:text-amber-100',
    Hecho: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/25 dark:text-emerald-100',
}

export default function VentasTareasPage() {
    const rows = [
        { t: 'Enviar cotización revisada a Tech Norte', c: 'Luis Mora', due: 'Hoy', st: 'En curso', pri: 'Alta' },
        { t: 'Llamada de seguimiento post-reunión', c: 'Industrias Delta', due: 'Mañana', st: 'Por hacer', pri: 'Media' },
        { t: 'Actualizar lista de precios Q2', c: 'Interno', due: 'Vie 16', st: 'Esperando', pri: 'Baja' },
        { t: 'Recordatorio: firma de contrato', c: 'Grupo Orion', due: 'Ayer', st: 'Hecho', pri: 'Alta' },
        { t: 'Preparar muestras para visita', c: 'Logística Sur', due: 'Lun 19', st: 'Por hacer', pri: 'Media' },
    ]

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-violet-950 dark:text-white">Pendientes de la semana</h1>
                    <p className="text-sm text-violet-800/70 dark:text-violet-200/60 mt-1">Notas y tareas con estado de avance.</p>
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-4">
                {[
                    ['Por hacer', '2', 'border-slate-200'],
                    ['En curso', '1', 'border-sky-200'],
                    ['Esperando', '1', 'border-amber-200'],
                    ['Hecho', '1', 'border-emerald-200'],
                ].map(([label, n, b]) => (
                    <div key={label} className={`${card} border-t-4 ${b} p-4`}>
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-violet-300/60">{label}</p>
                        <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{n}</p>
                    </div>
                ))}
            </div>

            <div className={card + ' overflow-hidden'}>
                <div className="border-b border-violet-100 px-5 py-4 dark:border-violet-900/40 flex flex-wrap gap-2 justify-between items-center">
                    <h2 className="font-semibold text-gray-900 dark:text-white">Lista de tareas</h2>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            className="rounded-lg bg-gradient-to-r from-[#5b4d7a] to-[#8b7cb8] px-4 py-2 text-xs font-semibold text-white opacity-60 cursor-not-allowed"
                            disabled
                        >
                            + Nueva tarea
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-sm">
                        <thead>
                            <tr className="bg-violet-50/80 text-left text-xs font-semibold text-violet-900 dark:bg-violet-950/40 dark:text-violet-200">
                                <th className="px-4 py-3">Tarea</th>
                                <th className="px-4 py-3">Cliente / contexto</th>
                                <th className="px-4 py-3">Vence</th>
                                <th className="px-4 py-3">Prioridad</th>
                                <th className="px-4 py-3">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-violet-50 dark:divide-violet-900/30">
                            {rows.map((r) => (
                                <tr key={r.t} className="hover:bg-violet-50/40 dark:hover:bg-white/[0.02]">
                                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100 max-w-xs">{r.t}</td>
                                    <td className="px-4 py-3 text-violet-800/90 dark:text-violet-200/80">{r.c}</td>
                                    <td className="px-4 py-3 text-gray-600 dark:text-violet-300/60">{r.due}</td>
                                    <td className="px-4 py-3">
                                        <span className="text-xs text-gray-500 dark:text-violet-300/50">{r.pri}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${badges[r.st]}`}>{r.st}</span>
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
