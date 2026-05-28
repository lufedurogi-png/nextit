'use client'

import { useEffect, useRef } from 'react'
import Label from '@/components/Label'

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
    let html = (htmlEditor || '').trim()
    if (cantidadImagenes > 0) {
        const bloque = Array.from({ length: cantidadImagenes }, (_, i) => `<p>[[IMG:${i}]]</p>`).join('')
        html = `${html}<div>${bloque}</div>`
    }
    return html
}

/** Recuadro tipo historia de Instagram: ~9:16, compacto */
const STORY_TILE = 'relative shrink-0 w-[4.5rem] h-[5.75rem] sm:w-[5rem] sm:h-[6.5rem]'

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
    purpleBtn,
    purpleStyle,
    ghostBtn,
}) {
    const imagenInputRef = useRef(null)

    useEffect(() => {
        if (mensajeResetKey === 0) return
        if (editorRef.current) {
            editorRef.current.innerHTML = ''
        }
        onCuerpoChange('')
    }, [mensajeResetKey, editorRef, onCuerpoChange])

    const toolbarBtn = `rounded-lg px-2.5 py-1.5 text-sm font-bold transition hover:bg-violet-200/80 dark:hover:bg-violet-800/50 ${
        darkMode ? 'text-violet-100' : 'text-violet-900'
    }`

    const aplicarFormato = (cmd) => {
        editorRef.current?.focus()
        try {
            document.execCommand(cmd, false, null)
        } catch (_) {}
    }

    const insertarEtiquetaUsuarios = () => {
        const el = editorRef.current
        if (!el) return
        el.focus()
        try {
            document.execCommand('insertText', false, ETIQUETA_USUARIOS)
        } catch (_) {
            el.textContent = (el.textContent || '') + ETIQUETA_USUARIOS
        }
        onCuerpoChange(el.innerHTML ?? '')
    }

    const cuerpoPlano = (cuerpoHtml || '').replace(/<[^>]+>/g, '')
    const tieneEtiquetaUsuarios = cuerpoPlano.includes(ETIQUETA_USUARIOS)
    const ejemploDestinatario = destinatariosSeleccionados?.[0]
    const nombreEjemplo = nombreVistaPreviaDestinatario(ejemploDestinatario)

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

    const tileBorder = darkMode ? 'border-violet-700/60' : 'border-violet-200'
    const tileAddBg = darkMode ? 'bg-[#12101a]/80 hover:bg-violet-950/60' : 'bg-violet-50/80 hover:bg-violet-100'

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
                <p className="text-xs text-violet-700/70 dark:text-violet-300/60 mb-2">
                    Selecciona texto y usa negrita, cursiva o subrayado. Inserta{' '}
                    <code className="rounded bg-violet-100/80 px-1 py-0.5 text-[11px] dark:bg-violet-900/50">{ETIQUETA_USUARIOS}</code>{' '}
                    para que cada destinatario vea su nombre registrado.
                </p>
                <div
                    className={`rounded-xl border overflow-hidden ${
                        darkMode ? 'border-violet-800/60' : 'border-violet-100'
                    }`}
                >
                    <div
                        className={`flex flex-wrap items-center gap-1 border-b px-2 py-1.5 ${
                            darkMode ? 'border-violet-800/60 bg-[#12101a]' : 'border-violet-100 bg-violet-50/80'
                        }`}
                        role="toolbar"
                        aria-label="Formato de texto"
                    >
                        <button type="button" className={toolbarBtn} onClick={() => aplicarFormato('bold')} title="Negrita">
                            <span className="font-bold">B</span>
                        </button>
                        <button type="button" className={toolbarBtn} onClick={() => aplicarFormato('italic')} title="Cursiva">
                            <span className="italic">I</span>
                        </button>
                        <button type="button" className={toolbarBtn} onClick={() => aplicarFormato('underline')} title="Subrayado">
                            <span className="underline">U</span>
                        </button>
                        <span className="mx-1 h-5 w-px bg-violet-200 dark:bg-violet-800/80" aria-hidden />
                        <button
                            type="button"
                            className={`${toolbarBtn} font-mono text-xs font-semibold normal-case tracking-tight`}
                            onClick={insertarEtiquetaUsuarios}
                            title="Insertar nombre del destinatario"
                        >
                            {ETIQUETA_USUARIOS}
                        </button>
                    </div>
                    <div
                        key={`editor-${mensajeResetKey}`}
                        ref={editorRef}
                        contentEditable
                        suppressContentEditableWarning
                        role="textbox"
                        aria-multiline="true"
                        data-placeholder="Escribe tu mensaje aquí…"
                        onInput={() => onCuerpoChange(editorRef.current?.innerHTML ?? '')}
                        className={`min-h-[10rem] px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-inset focus:ring-violet-400/30 empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 dark:empty:before:text-violet-400/40 ${
                            darkMode ? 'bg-[#12101a] text-violet-50' : 'bg-white text-gray-900'
                        }`}
                    />
                </div>
                {tieneEtiquetaUsuarios && (
                    <p className="mt-2 text-xs text-violet-700/90 dark:text-violet-300/80 rounded-lg bg-violet-50/90 dark:bg-violet-950/40 px-3 py-2 border border-violet-100 dark:border-violet-900/50">
                        {ejemploDestinatario ? (
                            <>
                                Vista previa (ejemplo con{' '}
                                <strong>{ejemploDestinatario.nombre || ejemploDestinatario.email}</strong>): cada
                                persona verá su propio nombre donde escribiste{' '}
                                <code className="font-mono text-[11px]">{ETIQUETA_USUARIOS}</code> — p. ej. «Estimado{' '}
                                <strong>{nombreEjemplo}</strong>».
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
                <p className="text-xs text-violet-700/70 dark:text-violet-300/60 mb-3">
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
                        darkMode ? 'scrollbar-thumb-violet-800' : 'scrollbar-thumb-violet-200'
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
                                <div className="h-full w-full bg-violet-100 dark:bg-violet-950/50" />
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
                        <span className="text-2xl font-light text-violet-500 dark:text-violet-300 leading-none">+</span>
                        <span className="text-[9px] font-medium uppercase tracking-wide text-violet-600/80 dark:text-violet-400/80">
                            Añadir
                        </span>
                    </button>
                </div>

                {imagenesConArchivo.length > 0 && (
                    <p className="text-[11px] text-violet-600/70 dark:text-violet-400/60 mt-2">
                        {imagenesConArchivo.length} imagen{imagenesConArchivo.length !== 1 ? 'es' : ''} · desliza para ver más
                    </p>
                )}
            </div>

            <div>
                <Label htmlFor="ventas-correo-adjuntos">Archivos adjuntos (opcional)</Label>
                <p className="text-xs text-violet-700/70 dark:text-violet-300/60 mb-2">
                    Word, Excel, PowerPoint, TXT o imágenes. Adjunta todos los que necesites (el peso total depende de tu
                    servidor PHP).
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
                        darkMode ? 'file:bg-violet-700' : 'file:bg-violet-800'
                    }`}
                />
                {adjuntos.length > 0 && (
                    <>
                        <p className="text-[11px] text-violet-600/70 dark:text-violet-400/60 mt-2">
                            {adjuntos.length} archivo{adjuntos.length !== 1 ? 's' : ''} · puedes seguir añadiendo más
                        </p>
                        <ul className="mt-2 max-h-48 space-y-1.5 overflow-y-auto">
                            {adjuntos.map((f, i) => (
                                <li
                                    key={`${f.name}-${f.size}-${f.lastModified}-${i}`}
                                    className="flex items-center justify-between gap-2 rounded-lg bg-violet-50/80 px-3 py-2 text-xs dark:bg-[#12101a]/80"
                                >
                                    <span className="truncate text-violet-900 dark:text-violet-100">{f.name}</span>
                                    <div className="flex shrink-0 items-center gap-2">
                                        <span className="text-violet-600/80">{formatBytes(f.size)}</span>
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
                        darkMode ? 'border-violet-500/50 bg-violet-950/30' : 'border-violet-300 bg-violet-50'
                    }`}
                    role="dialog"
                    aria-labelledby="confirmar-envio-titulo"
                >
                    <h3 id="confirmar-envio-titulo" className="font-semibold text-violet-950 dark:text-white">
                        Confirmar envío
                    </h3>
                    <p className="text-sm text-violet-900/80 dark:text-violet-200/80">
                        Se enviará a <strong>{destinatariosSeleccionados.length}</strong> destinatario(s):
                    </p>
                    {tieneEtiquetaUsuarios && (
                        <p className="text-xs text-violet-800/90 dark:text-violet-200/70">
                            Cada persona verá su nombre donde usaste{' '}
                            <code className="font-mono rounded bg-white/60 px-1 dark:bg-black/20">{ETIQUETA_USUARIOS}</code>.
                        </p>
                    )}
                    <ul className="max-h-32 overflow-y-auto text-sm rounded-lg bg-white/60 dark:bg-[#12101a]/60 px-3 py-2 space-y-1">
                        {destinatariosSeleccionados.map((d) => (
                            <li key={d.id} className="text-violet-900 dark:text-violet-100">
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
                                        className="h-10 w-8 shrink-0 rounded-md overflow-hidden border border-violet-200 dark:border-violet-800"
                                    >
                                        <img src={s.preview} alt="" className="h-full w-full object-cover" />
                                    </div>
                                ))}
                            </div>
                            {imagenesConArchivo.length > 5 && (
                                <span className="text-xs text-violet-600 dark:text-violet-300">
                                    +{imagenesConArchivo.length - 5}
                                </span>
                            )}
                            <span className="text-xs text-violet-700/80 dark:text-violet-300/70">
                                {imagenesConArchivo.length} en el mensaje
                            </span>
                        </div>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1">
                        <button
                            type="button"
                            className={purpleBtn}
                            style={purpleStyle}
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

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-violet-100 dark:border-violet-900/40">
                <p className="text-xs text-violet-700/80 dark:text-violet-300/60">
                    {algunDestinatarioSeleccionado
                        ? `${destinatariosSeleccionados.length} destinatario(s) seleccionado(s).`
                        : 'Selecciona destinatarios en la tabla.'}
                </p>
                {!confirmacionAbierta && (
                    <button
                        type="button"
                        className={purpleBtn}
                        style={purpleStyle}
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
