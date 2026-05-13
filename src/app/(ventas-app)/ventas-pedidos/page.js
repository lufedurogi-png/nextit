'use client'

const card = 'rounded-2xl border border-violet-100 bg-white shadow-sm dark:border-violet-900/40 dark:bg-[#1a1628]/80 overflow-hidden'

export default function VentasPedidosPage() {
    const rows = [
        { id: '#4821', cli: 'Industrias Delta', st: 'Entregado', pago: 'Pagado', tot: '$11,200' },
        { id: '#4819', cli: 'Tech Norte', st: 'En ruta', pago: 'Pagado', tot: '$8,900' },
        { id: '#4815', cli: 'Grupo Orion', st: 'Preparación', pago: 'Pendiente', tot: '$15,200' },
        { id: '#4810', cli: 'Tech Norte', st: 'Entregado', pago: 'Pagado', tot: '$8,200' },
    ]

    const stClass = {
        Entregado: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100',
        'En ruta': 'bg-sky-100 text-sky-900 dark:bg-sky-900/30 dark:text-sky-100',
        Preparación: 'bg-amber-100 text-amber-900 dark:bg-amber-900/25 dark:text-amber-100',
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-violet-950 dark:text-white">Pedidos</h1>
                    <p className="text-sm text-violet-800/70 dark:text-violet-200/60 mt-1">Seguimiento de órdenes vinculadas a tus clientes.</p>
                </div>
            </div>

            <div className={card}>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-sm">
                        <thead>
                            <tr className="bg-violet-50/90 text-left text-xs font-semibold text-violet-900 dark:bg-violet-950/50 dark:text-violet-100">
                                <th className="px-4 py-3">Pedido</th>
                                <th className="px-4 py-3">Cliente</th>
                                <th className="px-4 py-3">Logística</th>
                                <th className="px-4 py-3">Pago</th>
                                <th className="px-4 py-3 text-right">Total</th>
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
                                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-violet-300/60">{r.pago}</td>
                                    <td className="px-4 py-3 text-right font-medium">{r.tot}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
