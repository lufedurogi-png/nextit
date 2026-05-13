'use client'

const card = 'rounded-2xl border border-violet-100 bg-white p-4 shadow-sm dark:border-violet-900/40 dark:bg-[#1a1628]/80'

export default function VentasCatalogoPage() {
    const items = [
        { n: 'Switch administrable 24p', sku: 'NET-SW-2401', p: '$2,840', st: 'En stock' },
        { n: 'Rack 19" 12U', sku: 'RCK-19-12U', p: '$8,200', st: 'Bajo mínimo' },
        { n: 'UPS 1.5 kVA', sku: 'PWR-UPS-15', p: '$12,900', st: 'En stock' },
        { n: 'Cable fibra OS2 500m', sku: 'FBR-OS2-500', p: '$6,450', st: 'En stock' },
        { n: 'Access point Wi‑Fi 6', sku: 'WIFI-AP6-01', p: '$3,100', st: 'Reservado' },
        { n: 'Licencia antivirus 50 eq.', sku: 'SEC-AV-50', p: '$4,200', st: 'En stock' },
    ]

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-violet-950 dark:text-white">Catálogo</h1>
                <p className="text-sm text-violet-800/70 dark:text-violet-200/60 mt-1">Referencias frecuentes para cotizar y armar pedidos.</p>
            </div>

            <div className="flex flex-wrap gap-2">
                <input
                    readOnly
                    placeholder="Buscar por nombre o SKU…"
                    className="min-w-[200px] flex-1 max-w-md rounded-xl border border-violet-100 bg-violet-50/50 px-4 py-2 text-sm dark:border-violet-800 dark:bg-[#12101a]"
                />
                <button type="button" className="rounded-xl border border-violet-200 px-4 py-2 text-sm font-medium dark:border-violet-700">
                    Filtros
                </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((it) => (
                    <div key={it.sku} className={card}>
                        <div className="aspect-[4/3] rounded-xl bg-gradient-to-br from-violet-100 to-violet-50 dark:from-violet-950/50 dark:to-[#12101a] mb-3" />
                        <p className="font-semibold text-gray-900 dark:text-white leading-snug">{it.n}</p>
                        <p className="text-xs text-violet-600 dark:text-violet-400 mt-1 font-mono">{it.sku}</p>
                        <div className="mt-3 flex items-center justify-between">
                            <span className="text-lg font-bold text-violet-900 dark:text-violet-100">{it.p}</span>
                            <span
                                className={`text-[10px] font-bold uppercase rounded-full px-2 py-0.5 ${
                                    it.st === 'En stock'
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
                                        : it.st === 'Bajo mínimo'
                                          ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100'
                                          : 'bg-sky-100 text-sky-900 dark:bg-sky-900/30 dark:text-sky-100'
                                }`}
                            >
                                {it.st}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
