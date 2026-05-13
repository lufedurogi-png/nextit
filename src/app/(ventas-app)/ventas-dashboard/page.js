'use client'

const card = 'rounded-2xl border border-violet-100 bg-white p-5 shadow-sm dark:border-violet-900/40 dark:bg-[#1a1628]/80'

export default function VentasDashboardPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-violet-950 dark:text-white">Resumen comercial</h1>
                    <p className="text-sm text-violet-800/70 dark:text-violet-200/60 mt-1">Indicadores clave y actividad reciente.</p>
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                    { label: 'Pipeline activo', value: '$184,200', sub: '+12% vs. mes anterior', tone: 'from-violet-600 to-indigo-500' },
                    { label: 'Oportunidades abiertas', value: '24', sub: '6 con seguimiento hoy', tone: 'from-fuchsia-500 to-violet-600' },
                    { label: 'Cotizaciones enviadas', value: '11', sub: '3 pendientes de respuesta', tone: 'from-violet-500 to-purple-500' },
                    { label: 'Pedidos del mes', value: '37', sub: 'Ticket medio $4,960', tone: 'from-indigo-500 to-violet-600' },
                ].map((k) => (
                    <div key={k.label} className={`${card} overflow-hidden`}>
                        <div className={`h-1 w-full rounded-full bg-gradient-to-r ${k.tone} mb-4`} />
                        <p className="text-xs font-medium uppercase tracking-wide text-violet-600/80 dark:text-violet-300/80">{k.label}</p>
                        <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{k.value}</p>
                        <p className="mt-2 text-xs text-gray-500 dark:text-violet-200/50">{k.sub}</p>
                    </div>
                ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className={`${card} lg:col-span-2`}>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold text-gray-900 dark:text-white">Embudo de ventas</h2>
                        <select disabled className="text-xs rounded-lg border border-violet-100 bg-violet-50/50 px-2 py-1 dark:border-violet-800 dark:bg-[#12101a]">
                            <option>Este trimestre</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        {[
                            { n: 'Calificación', pct: 92, amt: '$42,000' },
                            { n: 'Propuesta', pct: 74, amt: '$58,400' },
                            { n: 'Negociación', pct: 48, amt: '$51,200' },
                            { n: 'Cierre', pct: 31, amt: '$32,600' },
                        ].map((s) => (
                            <div key={s.n}>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-gray-600 dark:text-violet-200/70">{s.n}</span>
                                    <span className="font-medium text-violet-800 dark:text-violet-200">{s.amt}</span>
                                </div>
                                <div className="h-2 rounded-full bg-violet-100 dark:bg-violet-950/60 overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-[#5b4d7a] to-[#9b8ac8]"
                                        style={{ width: `${s.pct}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className={card}>
                    <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Origen de leads</h2>
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative h-40 w-40 rounded-full border-8 border-violet-200 dark:border-violet-800 flex items-center justify-center text-center">
                            <div>
                                <p className="text-2xl font-bold text-violet-900 dark:text-white">100%</p>
                                <p className="text-[10px] text-gray-500 dark:text-violet-300/60">Total</p>
                            </div>
                        </div>
                        <ul className="w-full space-y-2 text-xs">
                            {[
                                ['Web', '38%', 'bg-violet-500'],
                                ['Referidos', '27%', 'bg-fuchsia-400'],
                                ['Evento', '18%', 'bg-indigo-400'],
                                ['Cold email', '17%', 'bg-purple-400'],
                            ].map(([l, v, c]) => (
                                <li key={l} className="flex items-center justify-between">
                                    <span className="flex items-center gap-2 text-gray-600 dark:text-violet-200/70">
                                        <span className={`h-2 w-2 rounded-full ${c}`} />
                                        {l}
                                    </span>
                                    <span className="font-medium">{v}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <div className={card}>
                    <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Contactos recientes</h2>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs text-gray-500 dark:text-violet-300/60 border-b border-violet-100 dark:border-violet-800/50">
                                <th className="pb-2">Nombre</th>
                                <th className="pb-2">Empresa</th>
                                <th className="pb-2">Etapa</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-violet-50 dark:divide-violet-900/30">
                            {[
                                ['Ana Ruiz', 'Industrias Delta', 'Propuesta'],
                                ['Luis Mora', 'Tech Norte', 'Calificación'],
                                ['Carmen Vega', 'Grupo Orion', 'Negociación'],
                            ].map(([a, b, c]) => (
                                <tr key={a}>
                                    <td className="py-2 font-medium text-violet-800 dark:text-violet-200">{a}</td>
                                    <td className="py-2 text-gray-600 dark:text-violet-200/70">{b}</td>
                                    <td className="py-2">
                                        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-800 dark:bg-violet-600/25 dark:text-violet-100">
                                            {c}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className={card}>
                    <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Actividades de la semana</h2>
                    <ul className="space-y-3 text-sm">
                        {[
                            ['Lun', 'Seguimiento cotización #C-2401', '10:00'],
                            ['Mar', 'Presentación de producto con Tech Norte', '15:30'],
                            ['Mié', 'Llamada de descubrimiento', '09:00'],
                            ['Jue', 'Revisión de términos', '12:00'],
                        ].map(([d, t, h]) => (
                            <li key={t} className="flex gap-3 rounded-xl border border-violet-50 bg-violet-50/40 px-3 py-2 dark:border-violet-900/40 dark:bg-[#12101a]/60">
                                <span className="text-xs font-bold text-violet-600 dark:text-violet-300 w-8 shrink-0">{d}</span>
                                <div className="min-w-0 flex-1">
                                    <p className="font-medium text-gray-800 dark:text-gray-100">{t}</p>
                                    <p className="text-xs text-gray-500 dark:text-violet-300/50">{h}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    )
}
