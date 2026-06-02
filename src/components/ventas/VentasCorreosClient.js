'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useAdminTheme } from '@/contexts/AdminThemeContext'
import VentasCorreoDestinatariosPanel from '@/components/ventas/VentasCorreoDestinatariosPanel'
import VentasCorreoEditor, {
    buildCuerpoHtmlConImagenes,
    ETIQUETA_USUARIOS,
} from '@/components/ventas/VentasCorreoEditor'
import {
    fetchVentasCorreoDestinatarios,
    fetchVentasCorreoGrupos,
    sendVentasCorreos,
} from '@/lib/ventasCorreosApi'

const card = 'rounded-2xl border border-orange-100 bg-white p-4 sm:p-5 shadow-sm dark:border-orange-900/40 dark:bg-[#262626]/80'
const brandBtn =
    'rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-orange-400/40 disabled:opacity-50 disabled:cursor-not-allowed'
const brandStyle = { background: 'linear-gradient(90deg, #FF8000, #e67300)' }
const ghostBtn =
    'rounded-xl border border-orange-200 px-3 py-2 text-sm font-medium text-orange-900 transition hover:bg-orange-50 dark:border-orange-800/60 dark:text-orange-100 dark:hover:bg-white/5 disabled:opacity-50'
const dangerBtn =
    'rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-950/30 disabled:opacity-50'

export default function VentasCorreosClient() {
    const { darkMode } = useAdminTheme()

    const [grupos, setGrupos] = useState([])
    const [destinatarios, setDestinatarios] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState(null)

    const [tablaAbierta, setTablaAbierta] = useState(false)

    const [selectedIds, setSelectedIds] = useState(() => new Set())
    const [asunto, setAsunto] = useState('')
    const [cuerpoHtml, setCuerpoHtml] = useState('')
    const [imagenesSlots, setImagenesSlots] = useState([])
    const [adjuntos, setAdjuntos] = useState([])
    const [confirmacionAbierta, setConfirmacionAbierta] = useState(false)
    const [enviando, setEnviando] = useState(false)
    const [status, setStatus] = useState(null)
    const [mensajeResetKey, setMensajeResetKey] = useState(0)
    const editorRef = useRef(null)

    const limpiarFormularioMensaje = useCallback(() => {
        setCuerpoHtml('')
        setImagenesSlots((prev) => {
            prev.forEach((s) => {
                if (s.preview) URL.revokeObjectURL(s.preview)
            })
            return []
        })
        setAdjuntos([])
        if (editorRef.current) {
            editorRef.current.innerHTML = ''
        }
        setMensajeResetKey((k) => k + 1)
    }, [])

    const inputCls = `w-full rounded-xl border px-3 py-2 text-sm transition-colors ${
        darkMode
            ? 'border-orange-800/60 bg-[#202020] text-orange-50 placeholder:text-orange-400/40'
            : 'border-orange-100 bg-white text-gray-900 placeholder:text-gray-400'
    }`

    const refresh = useCallback(async () => {
        setLoadError(null)
        setLoading(true)
        try {
            const [listaGrupos, listaDest] = await Promise.all([
                fetchVentasCorreoGrupos(),
                fetchVentasCorreoDestinatarios(),
            ])
            setGrupos(listaGrupos)
            setDestinatarios(listaDest)
            setSelectedIds((prev) => {
                const valid = new Set(listaDest.map((d) => d.id))
                const next = new Set()
                prev.forEach((id) => {
                    if (valid.has(id)) next.add(id)
                })
                return next
            })
        } catch (e) {
            setLoadError(e?.response?.data?.message || e?.message || 'Error al cargar destinatarios.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        refresh()
    }, [refresh])

    const algunSeleccionado = selectedIds.size > 0

    const destinatariosSeleccionados = useMemo(
        () => destinatarios.filter((d) => selectedIds.has(d.id)),
        [destinatarios, selectedIds],
    )

    const pedirConfirmacionEnvio = () => {
        if (selectedIds.size === 0) {
            setStatus({ type: 'err', text: 'Selecciona al menos un destinatario.' })
            return
        }
        if (!asunto.trim()) {
            setStatus({ type: 'err', text: 'Escribe el asunto del correo.' })
            return
        }
        const cuerpoPlano = (cuerpoHtml.replace(/<[^>]+>/g, '').trim() || '')
        const tieneTexto = cuerpoPlano.length > 0 || cuerpoHtml.includes(ETIQUETA_USUARIOS)
        const tieneImagenes = imagenesSlots.some((s) => s.file)
        if (!tieneTexto && !tieneImagenes) {
            setStatus({ type: 'err', text: 'Escribe el mensaje o agrega al menos una imagen.' })
            return
        }
        setStatus(null)
        setConfirmacionAbierta(true)
    }

    const ejecutarEnvio = async () => {
        const imagenesOrdenadas = imagenesSlots.filter((s) => s.file).map((s) => s.file)
        const cuerpoFinal = buildCuerpoHtmlConImagenes(cuerpoHtml, imagenesOrdenadas.length)

        setEnviando(true)
        setStatus(null)
        try {
            const res = await sendVentasCorreos({
                asunto: asunto.trim(),
                cuerpo: cuerpoFinal,
                destinatario_ids: Array.from(selectedIds),
                adjuntos,
                imagenes_inline: imagenesOrdenadas,
            })
            const fallidos = res?.data?.fallidos?.length || 0
            const enviados = res?.data?.enviados ?? 0
            setStatus({
                type: fallidos > 0 ? 'warn' : 'ok',
                text: res.message || 'Correos enviados.',
            })
            if (enviados > 0) {
                limpiarFormularioMensaje()
            }
            setConfirmacionAbierta(false)
        } catch (err) {
            setStatus({ type: 'err', text: err?.response?.data?.message || err?.message || 'Error al enviar.' })
        } finally {
            setEnviando(false)
        }
    }

    return (
        <div className="w-full space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-orange-950 dark:text-white">Correos</h1>
                <p className="text-sm text-orange-800/70 dark:text-orange-200/60 mt-1">
                    Organiza contactos por grupo, redacta tu mensaje y envía a uno o varios destinatarios.
                </p>
                <Link
                    href="/ventas-correos-historial"
                    className="inline-block mt-2 text-sm font-medium text-orange-700 hover:underline dark:text-orange-300"
                >
                    Ver historial de envíos →
                </Link>
            </div>

            {status && (
                <div
                    className={`rounded-xl border px-4 py-3 text-sm ${
                        status.type === 'ok'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100'
                            : status.type === 'warn'
                              ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100'
                              : 'border-red-200 bg-red-50 text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100'
                    }`}
                    role="status"
                >
                    {status.text}
                </div>
            )}

            {loadError && (
                <div className={`${card} border-red-200 dark:border-red-900/50`}>
                    <p className="text-sm text-red-700 dark:text-red-200">{loadError}</p>
                    <button type="button" className={`${ghostBtn} mt-3`} onClick={refresh}>
                        Reintentar
                    </button>
                </div>
            )}

            <div className="grid gap-6 md:grid-cols-[minmax(320px,26rem)_minmax(0,1fr)] 2xl:grid-cols-[28rem_minmax(0,1fr)]">
                <VentasCorreoDestinatariosPanel
                    darkMode={darkMode}
                    card={card}
                    brandBtn={brandBtn}
                    brandStyle={brandStyle}
                    ghostBtn={ghostBtn}
                    dangerBtn={dangerBtn}
                    inputCls={inputCls}
                    grupos={grupos}
                    destinatarios={destinatarios}
                    loading={loading}
                    selectedIds={selectedIds}
                    onSelectedIdsChange={setSelectedIds}
                    onRefresh={refresh}
                    onStatus={setStatus}
                    tablaAbierta={tablaAbierta}
                    onTablaAbiertaChange={setTablaAbierta}
                />

                <div className="order-2 md:order-2 min-w-0">
                    <VentasCorreoEditor
                        darkMode={darkMode}
                        asunto={asunto}
                        onAsuntoChange={setAsunto}
                        cuerpoHtml={cuerpoHtml}
                        editorRef={editorRef}
                        mensajeResetKey={mensajeResetKey}
                        onCuerpoChange={setCuerpoHtml}
                        imagenesSlots={imagenesSlots}
                        onImagenesSlotsChange={setImagenesSlots}
                        adjuntos={adjuntos}
                        onAdjuntosChange={setAdjuntos}
                        onSubmitPedirConfirmacion={pedirConfirmacionEnvio}
                        confirmacionAbierta={confirmacionAbierta}
                        destinatariosSeleccionados={destinatariosSeleccionados}
                        onConfirmarEnvio={ejecutarEnvio}
                        onCancelarConfirmacion={() => setConfirmacionAbierta(false)}
                        enviando={enviando}
                        algunDestinatarioSeleccionado={algunSeleccionado}
                        inputCls={inputCls}
                        card={card}
                        brandBtn={brandBtn}
                        brandStyle={brandStyle}
                        ghostBtn={ghostBtn}
                    />
                </div>
            </div>
        </div>
    )
}
