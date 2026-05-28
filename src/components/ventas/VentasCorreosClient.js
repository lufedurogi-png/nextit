'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Input from '@/components/Input'
import Label from '@/components/Label'
import { useAdminTheme } from '@/contexts/AdminThemeContext'
import VentasCorreoEditor, {
    buildCuerpoHtmlConImagenes,
    ETIQUETA_USUARIOS,
} from '@/components/ventas/VentasCorreoEditor'
import {
    createVentasCorreoDestinatario,
    deleteVentasCorreoDestinatario,
    fetchVentasCorreoDestinatarios,
    sendVentasCorreos,
} from '@/lib/ventasCorreosApi'

const card = 'rounded-2xl border border-violet-100 bg-white p-4 sm:p-5 shadow-sm dark:border-violet-900/40 dark:bg-[#1a1628]/80'
const purpleBtn =
    'rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-violet-400/40 disabled:opacity-50 disabled:cursor-not-allowed'
const purpleStyle = { background: 'linear-gradient(90deg, #5b4d7a, #8b7cb8)' }
const ghostBtn =
    'rounded-xl border border-violet-200 px-3 py-2 text-sm font-medium text-violet-900 transition hover:bg-violet-50 dark:border-violet-800/60 dark:text-violet-100 dark:hover:bg-white/5 disabled:opacity-50'

function formatFecha(iso) {
    if (!iso) return '—'
    try {
        return new Date(iso).toLocaleDateString('es-MX', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        })
    } catch {
        return '—'
    }
}

export default function VentasCorreosClient() {
    const { darkMode } = useAdminTheme()

    const [destinatarios, setDestinatarios] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState(null)

    const [tablaAbierta, setTablaAbierta] = useState(false)
    const [nuevoEmail, setNuevoEmail] = useState('')
    const [nuevoNombre, setNuevoNombre] = useState('')
    const [guardandoDest, setGuardandoDest] = useState(false)

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
            ? 'border-violet-800/60 bg-[#12101a] text-violet-50 placeholder:text-violet-400/40'
            : 'border-violet-100 bg-white text-gray-900 placeholder:text-gray-400'
    }`

    const refresh = useCallback(async () => {
        setLoadError(null)
        setLoading(true)
        try {
            const list = await fetchVentasCorreoDestinatarios()
            setDestinatarios(list)
            setSelectedIds((prev) => {
                const valid = new Set(list.map((d) => d.id))
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

    const todosSeleccionados = useMemo(() => {
        if (destinatarios.length === 0) return false
        return destinatarios.every((d) => selectedIds.has(d.id))
    }, [destinatarios, selectedIds])

    const algunSeleccionado = selectedIds.size > 0

    const destinatariosSeleccionados = useMemo(
        () => destinatarios.filter((d) => selectedIds.has(d.id)),
        [destinatarios, selectedIds],
    )

    const toggleTodos = () => {
        if (todosSeleccionados) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(destinatarios.map((d) => d.id)))
        }
    }

    const toggleUno = (id) => {
        setSelectedIds((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const handleRegistrar = async (e) => {
        e.preventDefault()
        const email = nuevoEmail.trim()
        if (!email) return
        setGuardandoDest(true)
        setStatus(null)
        try {
            const { row, message } = await createVentasCorreoDestinatario({
                email,
                nombre: nuevoNombre.trim() || undefined,
            })
            setDestinatarios((prev) => {
                const idx = prev.findIndex((d) => d.id === row.id)
                if (idx >= 0) {
                    const copy = [...prev]
                    copy[idx] = row
                    return copy.sort((a, b) => (a.nombre || a.email).localeCompare(b.nombre || b.email, 'es'))
                }
                return [...prev, row].sort((a, b) => (a.nombre || a.email).localeCompare(b.nombre || b.email, 'es'))
            })
            setSelectedIds((prev) => new Set(prev).add(row.id))
            setNuevoEmail('')
            setNuevoNombre('')
            setStatus({ type: 'ok', text: message || 'Correo registrado.' })
        } catch (err) {
            setStatus({ type: 'err', text: err?.response?.data?.message || err?.message || 'No se pudo registrar.' })
        } finally {
            setGuardandoDest(false)
        }
    }

    const handleEliminar = async (id) => {
        if (!window.confirm('¿Eliminar este destinatario de tu lista?')) return
        try {
            await deleteVentasCorreoDestinatario(id)
            setDestinatarios((prev) => prev.filter((d) => d.id !== id))
            setSelectedIds((prev) => {
                const next = new Set(prev)
                next.delete(id)
                return next
            })
        } catch (err) {
            setStatus({ type: 'err', text: err?.response?.data?.message || err?.message || 'No se pudo eliminar.' })
        }
    }

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
        <div className="space-y-6 max-w-5xl">
            <div>
                <h1 className="text-2xl font-bold text-violet-950 dark:text-white">Correos</h1>
                <p className="text-sm text-violet-800/70 dark:text-violet-200/60 mt-1">
                    Registra contactos, redacta tu mensaje y envía a uno o varios destinatarios.
                </p>
                <Link
                    href="/ventas-correos-historial"
                    className="inline-block mt-2 text-sm font-medium text-violet-700 hover:underline dark:text-violet-300"
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

            <section className={card}>
                <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 text-left"
                    onClick={() => setTablaAbierta((o) => !o)}
                    aria-expanded={tablaAbierta}
                >
                    <div>
                        <h2 className="font-semibold text-gray-900 dark:text-white">Destinatarios registrados</h2>
                        <p className="text-xs text-violet-700/70 dark:text-violet-300/60 mt-0.5">
                            {destinatarios.length} en tu lista · {selectedIds.size} seleccionado(s)
                        </p>
                    </div>
                    <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200 transition-transform ${
                            tablaAbierta ? 'rotate-180' : ''
                        }`}
                        aria-hidden
                    >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </span>
                </button>

                {tablaAbierta && (
                    <div className="mt-4 space-y-4 border-t border-violet-100 pt-4 dark:border-violet-900/40">
                        <form onSubmit={handleRegistrar} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                            <div>
                                <Label htmlFor="ventas-correo-email">Correo</Label>
                                <Input
                                    id="ventas-correo-email"
                                    type="email"
                                    required
                                    value={nuevoEmail}
                                    onChange={(e) => setNuevoEmail(e.target.value)}
                                    placeholder="cliente@empresa.com"
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <Label htmlFor="ventas-correo-nombre">Nombre (opcional)</Label>
                                <Input
                                    id="ventas-correo-nombre"
                                    type="text"
                                    value={nuevoNombre}
                                    onChange={(e) => setNuevoNombre(e.target.value)}
                                    placeholder="Contacto o empresa"
                                    className={inputCls}
                                />
                            </div>
                            <button type="submit" className={purpleBtn} style={purpleStyle} disabled={guardandoDest}>
                                {guardandoDest ? 'Guardando…' : 'Registrar'}
                            </button>
                        </form>

                        {loading ? (
                            <p className="text-sm text-violet-600/80 dark:text-violet-300/70 py-6 text-center">Cargando…</p>
                        ) : destinatarios.length === 0 ? (
                            <p className="text-sm text-violet-600/80 dark:text-violet-300/70 py-6 text-center rounded-xl bg-violet-50/50 dark:bg-[#12101a]/60">
                                Aún no hay correos registrados. Agrega el primero arriba.
                            </p>
                        ) : (
                            <div className="overflow-x-auto rounded-xl border border-violet-100 dark:border-violet-900/50">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-xs uppercase tracking-wide text-violet-700/80 bg-violet-50/80 dark:bg-[#12101a]/80 dark:text-violet-300/70">
                                            <th className="p-3 w-10">
                                                <input
                                                    type="checkbox"
                                                    checked={todosSeleccionados}
                                                    onChange={toggleTodos}
                                                    className="rounded border-violet-300 text-violet-700 focus:ring-violet-500"
                                                    aria-label="Seleccionar todos"
                                                />
                                            </th>
                                            <th className="p-3 font-medium">Nombre</th>
                                            <th className="p-3 font-medium">Correo</th>
                                            <th className="p-3 font-medium hidden sm:table-cell">Registrado</th>
                                            <th className="p-3 w-16" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {destinatarios.map((d) => (
                                            <tr
                                                key={d.id}
                                                className="border-t border-violet-100 dark:border-violet-900/40 hover:bg-violet-50/40 dark:hover:bg-white/[0.02]"
                                            >
                                                <td className="p-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.has(d.id)}
                                                        onChange={() => toggleUno(d.id)}
                                                        className="rounded border-violet-300 text-violet-700 focus:ring-violet-500"
                                                        aria-label={`Seleccionar ${d.email}`}
                                                    />
                                                </td>
                                                <td className="p-3 text-gray-800 dark:text-violet-100">{d.nombre || '—'}</td>
                                                <td className="p-3 font-medium text-violet-900 dark:text-violet-200">{d.email}</td>
                                                <td className="p-3 text-gray-500 dark:text-violet-300/60 hidden sm:table-cell">
                                                    {formatFecha(d.created_at)}
                                                </td>
                                                <td className="p-3 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleEliminar(d.id)}
                                                        className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                                    >
                                                        Quitar
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {destinatarios.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                <button type="button" className={ghostBtn} onClick={toggleTodos}>
                                    {todosSeleccionados ? 'Desmarcar todos' : 'Seleccionar todos'}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </section>

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
                purpleBtn={purpleBtn}
                purpleStyle={purpleStyle}
                ghostBtn={ghostBtn}
            />
        </div>
    )
}
