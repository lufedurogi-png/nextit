'use client'

const card = 'rounded-2xl border border-violet-100 bg-white p-5 shadow-sm dark:border-violet-900/40 dark:bg-[#1a1628]/80'

export default function VentasCalendarioPage() {
    const week = [
        { day: 'Lun 12', events: [{ h: '09:00', t: 'Llamada — Industrias Delta' }, { h: '16:00', t: 'Seguimiento cotización C-2401' }] },
        { day: 'Mar 13', events: [{ h: '14:30', t: 'Visita — Tech Norte' }] },
        { day: 'Mié 14', events: [{ h: '10:00', t: 'Revisión interna precios Q2' }] },
        { day: 'Jue 15', events: [{ h: '11:00', t: 'Grupo Orion — términos' }] },
        { day: 'Vie 16', events: [{ h: '15:00', t: 'Cierre trimestral — equipo' }] },
    ]

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-violet-950 dark:text-white">Calendario</h1>
                <p className="text-sm text-violet-800/70 dark:text-violet-200/60 mt-1">Semana actual y citas comerciales.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {week.map((col) => (
                    <div key={col.day} className={card}>
                        <p className="text-xs font-bold uppercase tracking-wide text-violet-600 dark:text-violet-300 mb-3">{col.day}</p>
                        <ul className="space-y-2">
                            {col.events.map((ev) => (
                                <li
                                    key={ev.t}
                                    className="rounded-xl border border-violet-100 bg-violet-50/60 px-3 py-2 text-sm dark:border-violet-800/50 dark:bg-[#12101a]/80"
                                >
                                    <p className="text-[11px] font-semibold text-violet-700 dark:text-violet-300">{ev.h}</p>
                                    <p className="text-gray-800 dark:text-gray-100 leading-snug mt-0.5">{ev.t}</p>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <div className={card}>
                    <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Próximas 48 h</h2>
                    <ul className="space-y-2 text-sm">
                        {[
                            ['Mañana 09:00', 'Industrias Delta — renovación'],
                            ['Mañana 15:30', 'Tech Norte — presentación'],
                        ].map(([h, d]) => (
                            <li key={d} className="flex flex-col sm:flex-row sm:justify-between gap-1 rounded-lg border border-violet-100 px-3 py-2 dark:border-violet-800/50">
                                <span className="text-violet-700 dark:text-violet-300 font-medium">{h}</span>
                                <span className="text-gray-600 dark:text-violet-200/80">{d}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className={card}>
                    <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Integración</h2>
                    <p className="text-sm text-gray-600 dark:text-violet-200/70">
                        Las citas pueden enlazarse a oportunidades y pedidos cuando conectes tu calendario externo.
                    </p>
                </div>
            </div>
        </div>
    )
}
