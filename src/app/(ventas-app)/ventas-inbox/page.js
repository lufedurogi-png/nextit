'use client'

const panel = 'rounded-2xl border border-violet-100 bg-white dark:border-violet-900/40 dark:bg-[#1a1628]/80 flex flex-col overflow-hidden'

export default function VentasInboxPage() {
    const clientes = [
        { n: 'Ana Ruiz', e: 'ana.ruiz@delta.mx', u: 2, active: true },
        { n: 'Luis Mora', e: 'luis@technorte.com', u: 0, active: false },
        { n: 'Carmen Vega', e: 'cvega@orion.mx', u: 1, active: false },
    ]

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-violet-950 dark:text-white">Bandeja</h1>
                    <p className="text-sm text-violet-800/70 dark:text-violet-200/60 mt-1">Mensajes y seguimiento con clientes.</p>
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-12 min-h-[520px]">
                <div className={`${panel} lg:col-span-3`}>
                    <div className="border-b border-violet-100 px-3 py-2 dark:border-violet-900/40">
                        <input
                            readOnly
                            placeholder="Filtrar clientes…"
                            className="w-full rounded-lg border border-violet-100 bg-violet-50/50 px-3 py-2 text-sm dark:border-violet-800 dark:bg-[#12101a]"
                        />
                    </div>
                    <ul className="overflow-y-auto flex-1">
                        {clientes.map((c) => (
                            <li
                                key={c.e}
                                className={`border-b border-violet-50 px-3 py-3 cursor-default dark:border-violet-900/30 ${
                                    c.active ? 'bg-violet-50/80 dark:bg-violet-600/15' : ''
                                }`}
                            >
                                <p className="font-medium text-sm text-gray-900 dark:text-white">{c.n}</p>
                                <p className="text-xs text-violet-700/70 dark:text-violet-300/60 truncate">{c.e}</p>
                                {c.u > 0 && (
                                    <span className="mt-1 inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-900/40 dark:text-rose-200">
                                        {c.u} sin leer
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className={`${panel} lg:col-span-6`}>
                    <div className="border-b border-violet-100 px-4 py-3 flex items-center justify-between dark:border-violet-900/40">
                        <div>
                            <p className="text-xs text-gray-500 dark:text-violet-300/50">Conversación con</p>
                            <p className="font-semibold text-gray-900 dark:text-white">Ana Ruiz</p>
                        </div>
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
                            Abierta
                        </span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-violet-50/20 dark:bg-[#12101a]/40">
                        <div className="flex gap-2">
                            <div className="h-8 w-8 rounded-full bg-violet-200 dark:bg-violet-700 shrink-0" />
                            <div className="rounded-2xl rounded-tl-sm bg-white border border-violet-100 px-4 py-2 text-sm max-w-[85%] dark:bg-[#221c36] dark:border-violet-800">
                                Hola, ¿nos pueden confirmar plazo de entrega para el pedido #4821?
                                <p className="text-[10px] text-gray-400 mt-1">Hace 2 h</p>
                            </div>
                        </div>
                        <div className="flex gap-2 flex-row-reverse">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#5b4d7a] to-[#8b7cb8] shrink-0" />
                            <div className="rounded-2xl rounded-tr-sm bg-violet-600 text-white px-4 py-2 text-sm max-w-[85%]">
                                Sí, serían 4–5 días hábiles una vez confirmado pago.
                                <p className="text-[10px] text-violet-200 mt-1">Hace 1 h</p>
                            </div>
                        </div>
                    </div>
                    <div className="border-t border-violet-100 p-3 dark:border-violet-900/40">
                        <div className="flex gap-2 rounded-xl border border-violet-100 bg-white px-3 py-2 dark:border-violet-800 dark:bg-[#12101a]">
                            <span className="text-xs text-gray-400 self-center">Mensaje</span>
                            <input readOnly className="flex-1 bg-transparent text-sm outline-none" placeholder="Escribe un mensaje…" />
                        </div>
                    </div>
                </div>

                <div className={`${panel} lg:col-span-3`}>
                    <div className="border-b border-violet-100 px-4 py-3 dark:border-violet-900/40">
                        <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Ficha rápida</h3>
                    </div>
                    <div className="p-4 space-y-4 text-sm flex-1 overflow-y-auto">
                        <div className="flex flex-col items-center text-center">
                            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-violet-200 to-violet-400 dark:from-violet-700 dark:to-violet-500 mb-2" />
                            <p className="font-semibold">Ana Ruiz</p>
                            <p className="text-xs text-violet-700 dark:text-violet-300/70">ana.ruiz@delta.mx</p>
                            <p className="text-xs text-gray-500 mt-1">+52 33 1234 5678</p>
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase text-gray-500 dark:text-violet-400/60 mb-2">Notas internas</p>
                            <textarea
                                readOnly
                                rows={4}
                                className="w-full rounded-xl border border-violet-100 bg-violet-50/30 p-2 text-xs dark:border-violet-800 dark:bg-[#12101a]"
                                defaultValue="Cliente prefiere contacto por correo por las mañanas."
                            />
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase text-gray-500 dark:text-violet-400/60 mb-2">Historial</p>
                            <ul className="space-y-2 text-xs text-gray-600 dark:text-violet-200/60">
                                <li>• Cotización C-2401 enviada — Lun</li>
                                <li>• Llamada saliente — Vie pasado</li>
                                <li>• Pedido #4821 entregado — Hace 2 sem.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
