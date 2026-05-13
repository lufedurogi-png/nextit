'use client'

const card = 'rounded-2xl border border-violet-100 bg-white shadow-sm dark:border-violet-900/40 dark:bg-[#1a1628]/80 overflow-hidden'

export default function VentasClientesPage() {
    const rows = [
        { n: 'Industrias Delta', c: 'Ana Ruiz', e: 'ana.ruiz@delta.mx', t: 'Cliente activo', o: '$84,200' },
        { n: 'Tech Norte', c: 'Luis Mora', e: 'luis@technorte.com', t: 'Prospecto', o: '$12,400' },
        { n: 'Grupo Orion', c: 'Carmen Vega', e: 'cvega@orion.mx', t: 'Negociación', o: '$33,800' },
        { n: 'Logística Sur', c: 'Pedro Sánchez', e: 'psanchez@logsur.mx', t: 'Lead', o: '$0' },
    ]

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-violet-950 dark:text-white">Clientes</h1>
                    <p className="text-sm text-violet-800/70 dark:text-violet-200/60 mt-1">Cuentas y contactos con su historial comercial.</p>
                </div>
            </div>

            <div className={card}>
                <div className="flex flex-wrap gap-2 border-b border-violet-100 px-4 py-3 dark:border-violet-900/40">
                    <button type="button" className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white opacity-70 cursor-not-allowed" disabled>
                        + Nuevo contacto
                    </button>
                    <button type="button" className="rounded-lg border border-violet-200 px-3 py-1.5 text-xs dark:border-violet-700 opacity-60 cursor-not-allowed" disabled>
                        Exportar CSV
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px] text-sm">
                        <thead>
                            <tr className="bg-violet-50/90 text-left text-xs font-semibold text-violet-900 dark:bg-violet-950/50 dark:text-violet-100">
                                <th className="px-4 py-3">Cuenta</th>
                                <th className="px-4 py-3">Contacto principal</th>
                                <th className="px-4 py-3">Email</th>
                                <th className="px-4 py-3">Etapa</th>
                                <th className="px-4 py-3 text-right">Pipeline</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-violet-50 dark:divide-violet-900/30">
                            {rows.map((r) => (
                                <tr key={r.e} className="hover:bg-violet-50/30 dark:hover:bg-white/[0.02]">
                                    <td className="px-4 py-3 font-medium text-violet-900 dark:text-violet-100">{r.n}</td>
                                    <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{r.c}</td>
                                    <td className="px-4 py-3 text-violet-700/80 dark:text-violet-300/70">{r.e}</td>
                                    <td className="px-4 py-3">
                                        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800 dark:bg-violet-600/25 dark:text-violet-100">
                                            {r.t}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">{r.o}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
