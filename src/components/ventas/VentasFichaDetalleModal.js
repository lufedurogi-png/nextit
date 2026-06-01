'use client'

import { VentasFichaProductosTabla } from '@/components/ventas/VentasFichaProductosTabla'
import { formatHistorialFecha } from '@/lib/chatApi'

const purpleBtn =
    'rounded-xl px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-50'
const purpleStyle = { background: 'linear-gradient(90deg, #5b4d7a, #8b7cb8)' }
const ghostBtn =
    'rounded-xl border border-violet-200 px-3 py-1.5 text-xs font-medium text-violet-900 transition hover:bg-violet-50 dark:border-violet-700 dark:text-violet-100 dark:hover:bg-white/5 disabled:opacity-50'

export default function VentasFichaDetalleModal({ open, onClose, darkMode, loading, detalle, titulo, onPdf, pdfLoading }) {
    if (!open) return null

    const totalFmt =
        detalle?.total != null
            ? Number(detalle.total).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
            : null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className={`relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border shadow-2xl ${
                    darkMode ? 'border-violet-800/60 bg-[#1a1628]' : 'border-violet-100 bg-white'
                }`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-3 border-b border-violet-100 px-5 py-4 dark:border-violet-900/40 shrink-0">
                    <div>
                        <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-violet-950'}`}>{titulo}</h3>
                        {detalle?.fecha && (
                            <p className={`text-xs mt-0.5 ${darkMode ? 'text-violet-300/70' : 'text-gray-500'}`}>
                                {detalle.fecha}
                                {detalle.created_at ? ` · ${formatHistorialFecha(detalle.created_at)}` : ''}
                            </p>
                        )}
                        {!detalle?.fecha && detalle?.created_at && (
                            <p className={`text-xs mt-0.5 ${darkMode ? 'text-violet-300/70' : 'text-gray-500'}`}>
                                {formatHistorialFecha(detalle.created_at)}
                            </p>
                        )}
                        {detalle?.estatus_pedido && (
                            <p className="text-xs mt-1 text-violet-600 dark:text-violet-300">
                                {detalle.estatus_pedido}
                                {detalle.estado_pago ? ` · ${detalle.estado_pago}` : ''}
                            </p>
                        )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                        {onPdf && (
                            <button
                                type="button"
                                onClick={onPdf}
                                disabled={pdfLoading || loading}
                                className={purpleBtn}
                                style={purpleStyle}
                            >
                                {pdfLoading ? 'PDF…' : 'PDF'}
                            </button>
                        )}
                        <button type="button" onClick={onClose} className={ghostBtn}>
                            Cerrar
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {loading ? (
                        <p className={`text-sm ${darkMode ? 'text-violet-300/70' : 'text-gray-500'}`}>Cargando…</p>
                    ) : (
                        <>
                            {totalFmt && (
                                <p className={`text-sm font-semibold ${darkMode ? 'text-violet-100' : 'text-violet-900'}`}>
                                    Total: {totalFmt}
                                </p>
                            )}
                            <VentasFichaProductosTabla items={detalle?.items ?? []} darkMode={darkMode} />
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
