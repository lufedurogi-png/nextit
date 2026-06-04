'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Label from '@/components/Label'
import {
    createVentasCorreoPlantilla,
    deleteVentasCorreoPlantilla,
    fetchVentasCorreoPlantillas,
    updateVentasCorreoPlantilla,
} from '@/lib/ventasCorreosApi'
import {
    aplicarEstiloEnSeleccion,
    FUENTES_CORREO,
    normalizarHtmlCorreo,
    RESALTADO_COLORES_CORREO,
    TAMANOS_LETRA_CORREO,
} from '@/lib/ventasCorreoRichText'

function formatBytes(n) {
    const b = Number(n) || 0
    if (b < 1024) return `${b} B`
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
    return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

/** Etiqueta de personalización: en el servidor se sustituye por el nombre de cada destinatario. */
export const ETIQUETA_USUARIOS = '@usuarios'

export function nombreVistaPreviaDestinatario(destinatario) {
    if (!destinatario) return '…'
    const nombre = (destinatario.nombre || '').trim()
    if (nombre) return nombre
    const email = destinatario.email || ''
    const local = email.includes('@') ? email.split('@')[0] : email
    return local || 'cliente'
}

export function buildCuerpoHtmlConImagenes(htmlEditor, cantidadImagenes) {
    let html = normalizarHtmlCorreo((htmlEditor || '').trim())
    if (cantidadImagenes > 0) {
        const bloque = Array.from({ length: cantidadImagenes }, (_, i) => `<p>[[IMG:${i}]]</p>`).join('')
        html = `${html}<div>${bloque}</div>`
    }
    return html
}

/** Recuadro tipo historia de Instagram: ~9:16, compacto */
const STORY_TILE = 'relative shrink-0 w-[4.5rem] h-[5.75rem] sm:w-[5rem] sm:h-[6.5rem]'

function ToolbarDropdown({ darkMode, label, children, panelClassName = '' }) {
    const [open, setOpen] = useState(false)
    const rootRef = useRef(null)
    const close = () => setOpen(false)

    useEffect(() => {
        if (!open) return undefined
        const onOutside = (e) => {
            if (rootRef.current && !rootRef.current.contains(e.target)) {
                close()
            }
        }
        document.addEventListener('mousedown', onOutside)
        return () => document.removeEventListener('mousedown', onOutside)
    }, [open])

    const triggerCls = `flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
        open
            ? darkMode
                ? 'border-orange-500/60 bg-orange-900/40 text-orange-50'
                : 'border-orange-400 bg-orange-100 text-orange-950'
            : darkMode
              ? 'border-orange-800/60 bg-[#262626]/80 text-orange-100 hover:bg-orange-950/60'
              : 'border-orange-200 bg-white text-orange-950 hover:bg-orange-50'
    }`

    const panelCls = `absolute left-0 top-full z-40 mt-1 overflow-hidden rounded-xl border shadow-lg ${
        darkMode ? 'border-orange-800/70 bg-[#262626]' : 'border-orange-200 bg-white shadow-orange-900/10'
    } ${panelClassName}`

    return (
        <div ref={rootRef} className="relative shrink-0">
            <button
                type="button"
                className={triggerCls}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                aria-haspopup="listbox"
            >
                <span>{label}</span>
                <svg
                    className={`h-3.5 w-3.5 shrink-0 opacity-60 transition ${open ? 'rotate-180' : ''}`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden
                >
                    <path
                        fillRule="evenodd"
                        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z"
                        clipRule="evenodd"
                    />
                </svg>
            </button>
            {open ? (
                <div className={panelCls} role="listbox" onMouseDown={(e) => e.preventDefault()}>
                    {typeof children === 'function' ? children({ close }) : children}
                </div>
            ) : null}
        </div>
    )
}

export default function VentasCorreoEditor({
    darkMode,
    asunto,
    onAsuntoChange,
    cuerpoHtml = '',
    editorRef,
    mensajeResetKey = 0,
    onCuerpoChange,
    imagenesSlots,
    onImagenesSlotsChange,
    adjuntos,
    onAdjuntosChange,
    onSubmitPedirConfirmacion,
    confirmacionAbierta,
    destinatariosSeleccionados,
    onConfirmarEnvio,
    onCancelarConfirmacion,
    enviando,
    algunDestinatarioSeleccionado,
    inputCls,
    card,
    brandBtn,
    brandStyle,
    ghostBtn,
    dangerBtn,
}) {
    const imagenInputRef = useRef(null)

    const [plantillas, setPlantillas] = useState([])
    const [plantillasLoading, setPlantillasLoading] = useState(true)
    /** null = redactar correo; 'nueva' o id numérico = editar plantilla */
    const [modoPlantilla, setModoPlantilla] = useState(null)
    const [plantillaNombre, setPlantillaNombre] = useState('')
    const [snapshotComposeHtml, setSnapshotComposeHtml] = useState('')
    const [plantillaError, setPlantillaError] = useState('')
    const [plantillaGuardando, setPlantillaGuardando] = useState(false)
    const [confirmEliminarPlantilla, setConfirmEliminarPlantilla] = useState(null)
    /** HTML a cargar en el editor al entrar en modo plantilla (evita perderlo al re-renderizar). */
    const [plantillaHtmlDraft, setPlantillaHtmlDraft] = useState('')
    const [formatoAviso, setFormatoAviso] = useState('')

    const enModoPlantilla = modoPlantilla !== null

    const syncEditorHtml = useCallback(() => {
        const raw = editorRef.current?.innerHTML ?? ''
        const html = normalizarHtmlCorreo(raw)
        if (editorRef.current && html !== raw) {
            editorRef.current.innerHTML = html
        }
        onCuerpoChange(html)
    }, [editorRef, onCuerpoChange])

    const avisoSeleccionTexto = useCallback((mensaje) => {
        setFormatoAviso(mensaje)
        window.setTimeout(() => setFormatoAviso(''), 2800)
    }, [])

    useEffect(() => {
        if (!enModoPlantilla) return
        const el = editorRef.current
        if (!el) return
        el.innerHTML = plantillaHtmlDraft
    }, [modoPlantilla, enModoPlantilla, plantillaHtmlDraft, editorRef])

    const cargarPlantillas = useCallback(async () => {
        setPlantillasLoading(true)
        try {
            const lista = await fetchVentasCorreoPlantillas()
            setPlantillas(Array.isArray(lista) ? lista : [])
        } catch {
            setPlantillas([])
        } finally {
            setPlantillasLoading(false)
        }
    }, [])

    useEffect(() => {
        cargarPlantillas()
    }, [cargarPlantillas])

    const salirModoPlantilla = useCallback(
        (restaurarCompose = true) => {
            if (restaurarCompose && editorRef.current) {
                const html = snapshotComposeHtml || ''
                editorRef.current.innerHTML = html
                onCuerpoChange(html)
            }
            setModoPlantilla(null)
            setPlantillaNombre('')
            setPlantillaHtmlDraft('')
            setSnapshotComposeHtml('')
            setPlantillaError('')
        },
        [snapshotComposeHtml, editorRef, onCuerpoChange],
    )

    const iniciarNuevaPlantilla = () => {
        if (enModoPlantilla) return
        const htmlActual = editorRef.current?.innerHTML ?? cuerpoHtml ?? ''
        setSnapshotComposeHtml(htmlActual)
        setPlantillaHtmlDraft('')
        setModoPlantilla('nueva')
        setPlantillaNombre('')
        setPlantillaError('')
        onCuerpoChange('')
        queueMicrotask(() => editorRef.current?.focus())
    }

    const iniciarEditarPlantilla = (plantilla) => {
        if (!enModoPlantilla) {
            const htmlActual = editorRef.current?.innerHTML ?? cuerpoHtml ?? ''
            setSnapshotComposeHtml(htmlActual)
        }
        const html = plantilla.cuerpo_html || ''
        setPlantillaHtmlDraft(html)
        setPlantillaNombre(plantilla.nombre || '')
        setPlantillaError('')
        setModoPlantilla(plantilla.id)
        onCuerpoChange(html)
        queueMicrotask(() => editorRef.current?.focus())
    }

    const cancelarPlantilla = () => {
        salirModoPlantilla(true)
    }

    const guardarPlantilla = async () => {
        const nombre = plantillaNombre.trim()
        const html = normalizarHtmlCorreo(editorRef.current?.innerHTML ?? '')
        const plano = html.replace(/<[^>]+>/g, '').trim()
        const tieneContenido = plano.length > 0 || html.includes(ETIQUETA_USUARIOS)

        if (!nombre) {
            setPlantillaError('Escribe un nombre para el mensaje preescrito.')
            return
        }
        if (!tieneContenido) {
            setPlantillaError('Escribe el contenido del mensaje preescrito.')
            return
        }

        setPlantillaGuardando(true)
        setPlantillaError('')
        try {
            if (modoPlantilla === 'nueva') {
                await createVentasCorreoPlantilla({ nombre, cuerpo_html: html })
            } else {
                await updateVentasCorreoPlantilla(modoPlantilla, { nombre, cuerpo_html: html })
            }
            await cargarPlantillas()
            salirModoPlantilla(true)
        } catch (e) {
            setPlantillaError(e?.response?.data?.message || e?.message || 'No se pudo guardar.')
        } finally {
            setPlantillaGuardando(false)
        }
    }

    const aplicarPlantilla = (plantilla) => {
        if (enModoPlantilla) return
        const html = plantilla.cuerpo_html || ''
        const actual = (editorRef.current?.innerHTML ?? cuerpoHtml ?? '').replace(/<[^>]+>/g, '').trim()
        if (actual.length > 0) {
            const ok = window.confirm(
                `¿Reemplazar el mensaje actual con «${plantilla.nombre}»?`,
            )
            if (!ok) return
        }
        if (editorRef.current) {
            editorRef.current.innerHTML = html
        }
        onCuerpoChange(html)
        editorRef.current?.focus()
    }

    const ejecutarEliminarPlantilla = async () => {
        if (!confirmEliminarPlantilla) return
        const id = confirmEliminarPlantilla.id
        setPlantillaGuardando(true)
        try {
            await deleteVentasCorreoPlantilla(id)
            if (modoPlantilla === id) {
                salirModoPlantilla(true)
            }
            await cargarPlantillas()
            setConfirmEliminarPlantilla(null)
        } catch (e) {
            setPlantillaError(e?.response?.data?.message || e?.message || 'No se pudo eliminar.')
            setConfirmEliminarPlantilla(null)
        } finally {
            setPlantillaGuardando(false)
        }
    }

    useEffect(() => {
        if (mensajeResetKey === 0) return
        setModoPlantilla(null)
        setPlantillaNombre('')
        setPlantillaHtmlDraft('')
        setSnapshotComposeHtml('')
        setPlantillaError('')
        if (editorRef.current) {
            editorRef.current.innerHTML = ''
        }
        onCuerpoChange('')
    }, [mensajeResetKey, editorRef, onCuerpoChange])

    const toolbarBtn = `rounded-lg px-2.5 py-1.5 text-sm font-bold transition hover:bg-orange-200/80 dark:hover:bg-orange-800/50 ${
        darkMode ? 'text-orange-100' : 'text-orange-900'
    }`

    const aplicarFormato = (cmd) => {
        editorRef.current?.focus()
        try {
            document.execCommand(cmd, false, null)
        } catch (_) {}
        syncEditorHtml()
    }

    const aplicarFuente = (fuente, close) => {
        const ok = aplicarEstiloEnSeleccion(
            editorRef.current,
            { fontFamily: fuente.value },
            syncEditorHtml,
        )
        if (!ok) avisoSeleccionTexto('Selecciona texto para aplicar la fuente.')
        else close?.()
    }

    const aplicarTamano = (tamano, close) => {
        const ok = aplicarEstiloEnSeleccion(
            editorRef.current,
            { fontSize: tamano.value },
            syncEditorHtml,
        )
        if (!ok) avisoSeleccionTexto('Selecciona texto para cambiar el tamaño.')
        else close?.()
    }

    const aplicarResaltado = (opcion, close) => {
        const ok = aplicarEstiloEnSeleccion(
            editorRef.current,
            { backgroundColor: opcion.value },
            syncEditorHtml,
        )
        if (!ok) avisoSeleccionTexto('Selecciona texto para resaltar.')
        else close?.()
    }

    const menuItemCls = (darkMode) =>
        `block w-full px-3 py-2 text-left text-sm transition ${
            darkMode ? 'text-orange-50 hover:bg-orange-900/50' : 'text-gray-800 hover:bg-orange-50'
        }`

    const insertarEtiquetaUsuarios = () => {
        const el = editorRef.current
        if (!el) return
        el.focus()
        try {
            document.execCommand('insertText', false, ETIQUETA_USUARIOS)
        } catch (_) {
            el.textContent = (el.textContent || '') + ETIQUETA_USUARIOS
        }
        syncEditorHtml()
    }

    const cuerpoPlano = (cuerpoHtml || '').replace(/<[^>]+>/g, '')
    const tieneEtiquetaUsuarios = cuerpoPlano.includes(ETIQUETA_USUARIOS)
    const ejemploDestinatario = destinatariosSeleccionados?.[0]

    const agregarImagen = (file) => {
        if (!file || !file.type.startsWith('image/')) return
        onImagenesSlotsChange((prev) => [
            ...prev,
            {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                file,
                preview: URL.createObjectURL(file),
            },
        ])
    }

    const quitarImagen = (id) => {
        onImagenesSlotsChange((prev) => {
            const slot = prev.find((s) => s.id === id)
            if (slot?.preview) URL.revokeObjectURL(slot.preview)
            return prev.filter((s) => s.id !== id)
        })
    }

    const imagenesConArchivo = imagenesSlots.filter((s) => s.file)

    const tileBorder = darkMode ? 'border-orange-700/60' : 'border-orange-200'
    const tileAddBg = darkMode ? 'bg-[#202020]/80 hover:bg-orange-950/60' : 'bg-orange-50/80 hover:bg-orange-100'

    return (
        <div className={`${card} space-y-4`}>
            <h2 className="font-semibold text-gray-900 dark:text-white">Redactar mensaje</h2>

            <div>
                <Label htmlFor="ventas-correo-asunto">Asunto</Label>
                <input
                    id="ventas-correo-asunto"
                    type="text"
                    required
                    maxLength={255}
                    value={asunto}
                    onChange={(e) => onAsuntoChange(e.target.value)}
                    placeholder="Asunto del correo"
                    className={inputCls}
                />
            </div>

            <div>
                <Label>Cuerpo del mensaje</Label>
                <p className="text-xs text-orange-700/70 dark:text-orange-300/60 mb-2">
                    Inserta{' '}
                    <code className="rounded bg-orange-100/80 px-1 py-0.5 text-[11px] dark:bg-orange-900/50">{ETIQUETA_USUARIOS}</code>{' '}
                    para que cada destinatario vea su nombre registrado.
                </p>
                {formatoAviso ? (
                    <p className="mb-2 text-xs font-medium text-amber-800 dark:text-amber-200/90 rounded-lg bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1.5 border border-amber-200/80 dark:border-amber-800/50">
                        {formatoAviso}
                    </p>
                ) : null}
                <div
                    className={`rounded-xl border overflow-hidden ${
                        darkMode ? 'border-orange-800/60' : 'border-orange-100'
                    }`}
                >
                    <div
                        className={`flex flex-wrap items-center gap-1 border-b px-2 py-1.5 ${
                            darkMode ? 'border-orange-800/60 bg-[#202020]' : 'border-orange-100 bg-orange-50/80'
                        }`}
                        role="toolbar"
                        aria-label="Formato de texto"
                    >
                        <button
                            type="button"
                            className={toolbarBtn}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => aplicarFormato('bold')}
                            title="Negrita"
                        >
                            <span className="font-bold">B</span>
                        </button>
                        <button
                            type="button"
                            className={toolbarBtn}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => aplicarFormato('italic')}
                            title="Cursiva"
                        >
                            <span className="italic">I</span>
                        </button>
                        <button
                            type="button"
                            className={toolbarBtn}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => aplicarFormato('underline')}
                            title="Subrayado (línea)"
                        >
                            <span className="underline">U</span>
                        </button>
                        <ToolbarDropdown darkMode={darkMode} label="Fuente" panelClassName="min-w-[11rem] max-h-56 overflow-y-auto">
                            {({ close }) =>
                                FUENTES_CORREO.map((f) => (
                                    <button
                                        key={f.label}
                                        type="button"
                                        role="option"
                                        className={menuItemCls(darkMode)}
                                        style={{ fontFamily: f.value }}
                                        onClick={() => aplicarFuente(f, close)}
                                    >
                                        {f.label}
                                    </button>
                                ))
                            }
                        </ToolbarDropdown>
                        <ToolbarDropdown darkMode={darkMode} label="Tamaño" panelClassName="min-w-[6.5rem] max-h-48 overflow-y-auto">
                            {({ close }) =>
                                TAMANOS_LETRA_CORREO.map((t) => (
                                    <button
                                        key={t.value}
                                        type="button"
                                        role="option"
                                        className={menuItemCls(darkMode)}
                                        style={{ fontSize: t.value }}
                                        onClick={() => aplicarTamano(t, close)}
                                    >
                                        {t.label}
                                    </button>
                                ))
                            }
                        </ToolbarDropdown>
                        <ToolbarDropdown darkMode={darkMode} label="Resaltar" panelClassName="min-w-[10.5rem] p-2">
                            {({ close }) => (
                                <div className="grid grid-cols-4 gap-1.5">
                                    {RESALTADO_COLORES_CORREO.map((c) => (
                                        <button
                                            key={c.label}
                                            type="button"
                                            role="option"
                                            title={c.label}
                                            className={`flex h-8 w-full items-center justify-center rounded-lg border-2 transition hover:scale-105 ${
                                                c.border
                                                    ? darkMode
                                                        ? 'border-dashed border-orange-600/70 bg-[#202020]'
                                                        : 'border-dashed border-orange-300 bg-white'
                                                    : darkMode
                                                      ? 'border-orange-900/60'
                                                      : 'border-orange-100'
                                            }`}
                                            onClick={() => aplicarResaltado(c, close)}
                                        >
                                            {c.border ? (
                                                <span
                                                    className={`text-[9px] font-bold leading-none ${
                                                        darkMode ? 'text-orange-300/80' : 'text-orange-700/70'
                                                    }`}
                                                >
                                                    ×
                                                </span>
                                            ) : (
                                                <span
                                                    className="block h-5 w-full max-w-[1.75rem] rounded-md"
                                                    style={{ backgroundColor: c.color }}
                                                />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </ToolbarDropdown>
                        <span className="mx-1 h-5 w-px shrink-0 bg-orange-200 dark:bg-orange-800/80" aria-hidden />
                        <button
                            type="button"
                            className={`${toolbarBtn} shrink-0 font-mono text-xs font-semibold normal-case tracking-tight`}
                            onClick={insertarEtiquetaUsuarios}
                            title="Insertar nombre del destinatario"
                        >
                            {ETIQUETA_USUARIOS}
                        </button>
                        <span className="mx-1 h-5 w-px shrink-0 bg-orange-200 dark:bg-orange-800/80" aria-hidden />
                        <div
                            className={`flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pb-0.5 ${
                                darkMode ? 'scrollbar-thumb-orange-800' : 'scrollbar-thumb-orange-200'
                            }`}
                            role="list"
                            aria-label="Mensajes preescritos"
                        >
                            {plantillasLoading ? (
                                <span className={`px-2 text-[11px] ${darkMode ? 'text-orange-400/60' : 'text-orange-700/60'}`}>
                                    Cargando…
                                </span>
                            ) : plantillas.length === 0 ? (
                                <span className={`px-1 text-[11px] italic ${darkMode ? 'text-orange-400/50' : 'text-orange-700/55'}`}>
                                    Sin preescritos
                                </span>
                            ) : (
                                plantillas.map((p) => (
                                    <div
                                        key={p.id}
                                        role="listitem"
                                        className={`inline-flex shrink-0 items-stretch overflow-hidden rounded-lg border text-xs font-semibold ${
                                            darkMode
                                                ? 'border-orange-700/60 bg-orange-950/40'
                                                : 'border-orange-200 bg-white shadow-sm'
                                        } ${enModoPlantilla && modoPlantilla === p.id ? 'ring-2 ring-amber-400/60' : ''}`}
                                    >
                                        <button
                                            type="button"
                                            disabled={enModoPlantilla}
                                            onClick={() => aplicarPlantilla(p)}
                                            title={`Usar «${p.nombre}» en el mensaje`}
                                            className={`max-w-[9.5rem] truncate px-2.5 py-1.5 transition ${
                                                enModoPlantilla
                                                    ? 'cursor-not-allowed opacity-45'
                                                    : darkMode
                                                      ? 'text-orange-100 hover:bg-orange-900/50'
                                                      : 'text-orange-950 hover:bg-orange-50'
                                            }`}
                                        >
                                            {p.nombre}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => iniciarEditarPlantilla(p)}
                                            title="Editar mensaje preescrito"
                                            className={`border-l px-2 py-1.5 transition ${
                                                darkMode
                                                    ? 'border-orange-800/80 text-orange-200 hover:bg-orange-900/60'
                                                    : 'border-orange-100 text-orange-800 hover:bg-orange-100'
                                            }`}
                                            aria-label={`Editar ${p.nombre}`}
                                        >
                                            ✎
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setConfirmEliminarPlantilla(p)}
                                            title="Eliminar mensaje preescrito"
                                            className={`border-l px-2 py-1.5 transition ${
                                                darkMode
                                                    ? 'border-orange-800/80 text-rose-300 hover:bg-rose-950/50'
                                                    : 'border-orange-100 text-rose-600 hover:bg-rose-50'
                                            }`}
                                            aria-label={`Eliminar ${p.nombre}`}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                        <button
                            type="button"
                            disabled={enModoPlantilla}
                            onClick={iniciarNuevaPlantilla}
                            title="Nuevo mensaje preescrito"
                            className={`ml-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-lg font-light leading-none transition ${
                                enModoPlantilla
                                    ? 'cursor-not-allowed opacity-40'
                                    : darkMode
                                      ? 'border-orange-500/70 bg-orange-950/50 text-orange-100 hover:bg-orange-800/50'
                                      : 'border-orange-400 bg-orange-50 text-orange-900 hover:bg-orange-100'
                            }`}
                            aria-label="Agregar mensaje preescrito"
                        >
                            +
                        </button>
                    </div>
                    {enModoPlantilla ? (
                        <div
                            className={`border-b px-3 py-2.5 space-y-2 ${
                                darkMode ? 'border-amber-800/50 bg-amber-950/25' : 'border-amber-200 bg-amber-50/90'
                            }`}
                        >
                            <p className={`text-xs font-medium ${darkMode ? 'text-amber-200/90' : 'text-amber-900/90'}`}>
                                Modo mensaje preescrito — al guardar quedará disponible en la barra superior.
                            </p>
                            <div>
                                <Label htmlFor="ventas-correo-plantilla-nombre" className="text-xs">
                                    Nombre del mensaje
                                </Label>
                                <input
                                    id="ventas-correo-plantilla-nombre"
                                    type="text"
                                    maxLength={80}
                                    value={plantillaNombre}
                                    onChange={(e) => setPlantillaNombre(e.target.value)}
                                    placeholder="Ej. Seguimiento, Promo, Bienvenida…"
                                    className={`mt-1 ${inputCls}`}
                                />
                            </div>
                        </div>
                    ) : null}
                    <div
                        key={`editor-${mensajeResetKey}`}
                        ref={editorRef}
                        contentEditable
                        suppressContentEditableWarning
                        role="textbox"
                        aria-multiline="true"
                        data-placeholder={
                            enModoPlantilla
                                ? 'Escribe aquí el mensaje preescrito…'
                                : 'Escribe tu mensaje aquí…'
                        }
                        onInput={() => syncEditorHtml()}
                        className={`min-h-[10rem] xl:min-h-[14rem] px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-inset empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 dark:empty:before:text-orange-400/40 ${
                            enModoPlantilla
                                ? darkMode
                                    ? 'bg-amber-950/35 text-orange-50 ring-2 ring-inset ring-amber-500/40 focus:ring-amber-400/50'
                                    : 'bg-amber-50/95 text-gray-900 ring-2 ring-inset ring-amber-300/80 focus:ring-amber-400/40'
                                : darkMode
                                  ? 'bg-[#202020] text-orange-50 focus:ring-orange-400/30'
                                  : 'bg-white text-gray-900 focus:ring-orange-400/30'
                        }`}
                    />
                    {enModoPlantilla ? (
                        <div
                            className={`flex flex-wrap items-center gap-2 border-t px-3 py-2.5 ${
                                darkMode ? 'border-amber-800/50 bg-amber-950/20' : 'border-amber-200 bg-amber-50/70'
                            }`}
                        >
                            <button
                                type="button"
                                className={brandBtn}
                                style={brandStyle}
                                disabled={plantillaGuardando}
                                onClick={guardarPlantilla}
                            >
                                {plantillaGuardando ? 'Guardando…' : 'Guardar'}
                            </button>
                            <button
                                type="button"
                                className={ghostBtn}
                                disabled={plantillaGuardando}
                                onClick={cancelarPlantilla}
                            >
                                Cancelar
                            </button>
                            {plantillaError ? (
                                <p className="w-full text-xs text-red-600 dark:text-red-300">{plantillaError}</p>
                            ) : null}
                        </div>
                    ) : null}
                </div>
                {tieneEtiquetaUsuarios && (
                    <p className="mt-2 text-xs text-orange-700/90 dark:text-orange-300/80 rounded-lg bg-orange-50/90 dark:bg-orange-950/40 px-3 py-2 border border-orange-100 dark:border-orange-900/50">
                        {ejemploDestinatario ? (
                            <>
                                Vista previa (ejemplo con <strong>Usuario</strong>): cada persona verá su propio nombre
                                donde escribiste <code className="font-mono text-[11px]">{ETIQUETA_USUARIOS}</code> — p.
                                ej. «Estimado <strong>Usuario</strong>».
                            </>
                        ) : (
                            <>
                                Al enviar, <code className="font-mono text-[11px]">{ETIQUETA_USUARIOS}</code> se
                                reemplazará por el nombre de cada destinatario. Selecciona contactos en la tabla.
                            </>
                        )}
                    </p>
                )}
            </div>

            <div>
                <Label>Imágenes en el correo</Label>
                <p className="text-xs text-orange-700/70 dark:text-orange-300/60 mb-3">
                    Toca el recuadro + para añadir fotos. Se envían debajo del texto, en el orden que las agregues.
                </p>

                <input
                    ref={imagenInputRef}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    aria-hidden
                    onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) agregarImagen(f)
                        e.target.value = ''
                    }}
                />

                <div
                    className={`flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory scrollbar-thin ${
                        darkMode ? 'scrollbar-thumb-orange-800' : 'scrollbar-thumb-orange-200'
                    }`}
                >
                    {imagenesSlots.map((slot, index) => (
                        <div
                            key={slot.id}
                            className={`${STORY_TILE} snap-start rounded-xl overflow-hidden border-2 shadow-sm ${tileBorder} group`}
                            title={slot.file?.name || `Imagen ${index + 1}`}
                        >
                            {slot.preview ? (
                                <img src={slot.preview} alt="" className="h-full w-full object-cover" />
                            ) : (
                                <div className="h-full w-full bg-orange-100 dark:bg-orange-950/50" />
                            )}
                            <button
                                type="button"
                                onClick={() => quitarImagen(slot.id)}
                                className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/55 text-white text-xs font-bold leading-none opacity-90 hover:bg-black/75 transition-opacity"
                                aria-label={`Quitar imagen ${index + 1}`}
                            >
                                ×
                            </button>
                        </div>
                    ))}

                    <button
                        type="button"
                        onClick={() => imagenInputRef.current?.click()}
                        className={`${STORY_TILE} snap-start rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-0.5 transition-colors ${tileBorder} ${tileAddBg}`}
                        aria-label="Agregar imagen"
                    >
                        <span className="text-2xl font-light text-orange-500 dark:text-orange-300 leading-none">+</span>
                        <span className="text-[9px] font-medium uppercase tracking-wide text-orange-600/80 dark:text-orange-400/80">
                            Añadir
                        </span>
                    </button>
                </div>

                {imagenesConArchivo.length > 0 && (
                    <p className="text-[11px] text-orange-600/70 dark:text-orange-400/60 mt-2">
                        {imagenesConArchivo.length} imagen{imagenesConArchivo.length !== 1 ? 'es' : ''} · desliza para ver más
                    </p>
                )}
            </div>

            <div>
                <Label htmlFor="ventas-correo-adjuntos">Archivos adjuntos (opcional)</Label>
                <p className="text-xs text-orange-700/70 dark:text-orange-300/60 mb-2">
                    Word, Excel, PowerPoint, TXT o imágenes.
                </p>
                <input
                    id="ventas-correo-adjuntos"
                    type="file"
                    multiple
                    accept=".doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,image/*"
                    onChange={(e) => {
                        const nuevos = Array.from(e.target.files || [])
                        if (nuevos.length === 0) return
                        onAdjuntosChange((prev) => {
                            const lista = Array.isArray(prev) ? [...prev] : []
                            nuevos.forEach((f) => {
                                const dup = lista.some(
                                    (x) =>
                                        x.name === f.name &&
                                        x.size === f.size &&
                                        x.lastModified === f.lastModified,
                                )
                                if (!dup) lista.push(f)
                            })
                            return lista
                        })
                        e.target.value = ''
                    }}
                    className={`block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white ${
                        darkMode ? 'file:bg-orange-700' : 'file:bg-orange-800'
                    }`}
                />
                {adjuntos.length > 0 && (
                    <>
                        <p className="text-[11px] text-orange-600/70 dark:text-orange-400/60 mt-2">
                            {adjuntos.length} archivo{adjuntos.length !== 1 ? 's' : ''} · puedes seguir añadiendo más
                        </p>
                        <ul className="mt-2 max-h-48 space-y-1.5 overflow-y-auto">
                            {adjuntos.map((f, i) => (
                                <li
                                    key={`${f.name}-${f.size}-${f.lastModified}-${i}`}
                                    className="flex items-center justify-between gap-2 rounded-lg bg-orange-50/80 px-3 py-2 text-xs dark:bg-[#202020]/80"
                                >
                                    <span className="truncate text-orange-900 dark:text-orange-100">{f.name}</span>
                                    <div className="flex shrink-0 items-center gap-2">
                                        <span className="text-orange-600/80">{formatBytes(f.size)}</span>
                                        <button
                                            type="button"
                                            className="text-red-600 hover:underline dark:text-red-400"
                                            onClick={() =>
                                                onAdjuntosChange((prev) => prev.filter((_, idx) => idx !== i))
                                            }
                                            aria-label={`Quitar ${f.name}`}
                                        >
                                            Quitar
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </div>

            {confirmacionAbierta && (
                <div
                    className={`rounded-xl border-2 p-4 space-y-3 ${
                        darkMode ? 'border-orange-500/50 bg-orange-950/30' : 'border-orange-300 bg-orange-50'
                    }`}
                    role="dialog"
                    aria-labelledby="confirmar-envio-titulo"
                >
                    <h3 id="confirmar-envio-titulo" className="font-semibold text-orange-950 dark:text-white">
                        Confirmar envío
                    </h3>
                    <p className="text-sm text-orange-900/80 dark:text-orange-200/80">
                        Se enviará a <strong>{destinatariosSeleccionados.length}</strong> destinatario(s):
                    </p>
                    {tieneEtiquetaUsuarios && (
                        <p className="text-xs text-orange-800/90 dark:text-orange-200/70">
                            Cada persona verá su nombre donde usaste{' '}
                            <code className="font-mono rounded bg-white/60 px-1 dark:bg-black/20">{ETIQUETA_USUARIOS}</code>.
                        </p>
                    )}
                    <ul className="max-h-32 overflow-y-auto text-sm rounded-lg bg-white/60 dark:bg-[#202020]/60 px-3 py-2 space-y-1">
                        {destinatariosSeleccionados.map((d) => (
                            <li key={d.id} className="text-orange-900 dark:text-orange-100">
                                {d.nombre ? `${d.nombre} · ` : ''}
                                {d.email}
                            </li>
                        ))}
                    </ul>
                    {imagenesConArchivo.length > 0 && (
                        <div className="flex items-center gap-2">
                            <div className="flex gap-1 overflow-hidden">
                                {imagenesConArchivo.slice(0, 5).map((s) => (
                                    <div
                                        key={s.id}
                                        className="h-10 w-8 shrink-0 rounded-md overflow-hidden border border-orange-200 dark:border-orange-800"
                                    >
                                        <img src={s.preview} alt="" className="h-full w-full object-cover" />
                                    </div>
                                ))}
                            </div>
                            {imagenesConArchivo.length > 5 && (
                                <span className="text-xs text-orange-600 dark:text-orange-300">
                                    +{imagenesConArchivo.length - 5}
                                </span>
                            )}
                            <span className="text-xs text-orange-700/80 dark:text-orange-300/70">
                                {imagenesConArchivo.length} en el mensaje
                            </span>
                        </div>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1">
                        <button
                            type="button"
                            className={brandBtn}
                            style={brandStyle}
                            disabled={enviando}
                            onClick={onConfirmarEnvio}
                        >
                            {enviando ? 'Enviando…' : 'Sí, enviar ahora'}
                        </button>
                        <button type="button" className={ghostBtn} disabled={enviando} onClick={onCancelarConfirmacion}>
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {confirmEliminarPlantilla ? (
                <>
                    <div
                        className="fixed inset-0 z-[60] bg-black/55 backdrop-blur-sm"
                        onClick={() => !plantillaGuardando && setConfirmEliminarPlantilla(null)}
                        aria-hidden
                    />
                    <div
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="eliminar-plantilla-titulo"
                        className={`fixed left-1/2 top-1/2 z-[61] w-[min(24rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border p-5 shadow-2xl ${
                            darkMode ? 'border-orange-900/50 bg-[#262626]' : 'border-orange-100 bg-white'
                        }`}
                    >
                        <h3 id="eliminar-plantilla-titulo" className="font-semibold text-gray-900 dark:text-white">
                            Eliminar mensaje preescrito
                        </h3>
                        <p className="mt-2 text-sm text-orange-900/85 dark:text-orange-200/80">
                            ¿Eliminar «<strong>{confirmEliminarPlantilla.nombre}</strong>»? Esta acción no se puede deshacer.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <button
                                type="button"
                                className={dangerBtn}
                                disabled={plantillaGuardando}
                                onClick={ejecutarEliminarPlantilla}
                            >
                                {plantillaGuardando ? 'Eliminando…' : 'Sí, eliminar'}
                            </button>
                            <button
                                type="button"
                                className={ghostBtn}
                                disabled={plantillaGuardando}
                                onClick={() => setConfirmEliminarPlantilla(null)}
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-orange-100 dark:border-orange-900/40">
                <p className="text-xs text-orange-700/80 dark:text-orange-300/60">
                    {algunDestinatarioSeleccionado
                        ? `${destinatariosSeleccionados.length} destinatario(s) seleccionado(s).`
                        : 'Selecciona destinatarios en la tabla.'}
                </p>
                {!confirmacionAbierta && (
                    <button
                        type="button"
                        className={brandBtn}
                        style={brandStyle}
                        disabled={enviando || !algunDestinatarioSeleccionado}
                        onClick={onSubmitPedirConfirmacion}
                    >
                        Enviar correos
                    </button>
                )}
            </div>
        </div>
    )
}
