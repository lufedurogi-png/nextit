'use client'

import { useMemo, useState } from 'react'
import Input from '@/components/Input'
import Label from '@/components/Label'
import VentasCorreoDesplegable from '@/components/ventas/VentasCorreoDesplegable'
import {
    createVentasCorreoDestinatario,
    createVentasCorreoGrupo,
    deleteVentasCorreoDestinatario,
    deleteVentasCorreoGrupo,
    updateVentasCorreoGrupo,
} from '@/lib/ventasCorreosApi'

export default function VentasCorreoDestinatariosPanel({
    darkMode,
    card,
    brandBtn,
    brandStyle,
    ghostBtn,
    dangerBtn,
    inputCls,
    grupos,
    destinatarios,
    loading,
    selectedIds,
    onSelectedIdsChange,
    onRefresh,
    onStatus,
    tablaAbierta,
    onTablaAbiertaChange,
}) {
    const [nuevoGrupoNombre, setNuevoGrupoNombre] = useState('')
    const [guardandoGrupo, setGuardandoGrupo] = useState(false)
    const [nuevoEmail, setNuevoEmail] = useState('')
    const [nuevoNombre, setNuevoNombre] = useState('')
    const [grupoIdRegistro, setGrupoIdRegistro] = useState('')
    const [guardandoDest, setGuardandoDest] = useState(false)

    const [editandoGrupoId, setEditandoGrupoId] = useState(null)
    const [editandoGrupoNombre, setEditandoGrupoNombre] = useState('')
    const [guardandoEdicionGrupo, setGuardandoEdicionGrupo] = useState(false)

    const [confirmDeleteGrupoId, setConfirmDeleteGrupoId] = useState(null)
    const [eliminandoGrupoId, setEliminandoGrupoId] = useState(null)

    const [confirmDeleteDestId, setConfirmDeleteDestId] = useState(null)
    const [eliminandoDestId, setEliminandoDestId] = useState(null)

    const [crearGrupoAbierto, setCrearGrupoAbierto] = useState(false)
    /** Vacío = todas las secciones de contactos por grupo cerradas al inicio. */
    const [gruposExpandidos, setGruposExpandidos] = useState(() => new Set())

    const opcionesGrupoRegistro = useMemo(
        () => [
            { value: '', label: 'Selecciona un grupo' },
            ...grupos.map((g) => ({ value: String(g.id), label: g.nombre })),
        ],
        [grupos],
    )

    const destinatariosPorGrupo = useMemo(() => {
        const map = new Map()
        grupos.forEach((g) => map.set(g.id, []))
        map.set(null, [])
        destinatarios.forEach((d) => {
            const key = d.grupo_id ?? null
            if (!map.has(key)) map.set(key, [])
            map.get(key).push(d)
        })
        return map
    }, [grupos, destinatarios])

    const todosSeleccionados =
        destinatarios.length > 0 && destinatarios.every((d) => selectedIds.has(d.id))

    const toggleTodos = () => {
        if (todosSeleccionados) {
            onSelectedIdsChange(new Set())
        } else {
            onSelectedIdsChange(new Set(destinatarios.map((d) => d.id)))
        }
    }

    const toggleUno = (id) => {
        onSelectedIdsChange((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const toggleGrupoTodos = (ids) => {
        const todosEnGrupo = ids.length > 0 && ids.every((id) => selectedIds.has(id))
        onSelectedIdsChange((prev) => {
            const next = new Set(prev)
            if (todosEnGrupo) {
                ids.forEach((id) => next.delete(id))
            } else {
                ids.forEach((id) => next.add(id))
            }
            return next
        })
    }

    const toggleExpandirGrupo = (id) => {
        setGruposExpandidos((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const handleCrearGrupo = async (e) => {
        e.preventDefault()
        const nombre = nuevoGrupoNombre.trim()
        if (!nombre) return
        setGuardandoGrupo(true)
        try {
            const row = await createVentasCorreoGrupo(nombre)
            setNuevoGrupoNombre('')
            if (!grupoIdRegistro) setGrupoIdRegistro(String(row.id))
            onStatus(null)
            await onRefresh()
        } catch (err) {
            onStatus({ type: 'err', text: err?.response?.data?.message || err?.message || 'No se pudo crear el grupo.' })
        } finally {
            setGuardandoGrupo(false)
        }
    }

    const guardarEdicionGrupo = async (id) => {
        const nombre = editandoGrupoNombre.trim()
        if (!nombre) return
        setGuardandoEdicionGrupo(true)
        try {
            await updateVentasCorreoGrupo(id, nombre)
            setEditandoGrupoId(null)
            setEditandoGrupoNombre('')
            onStatus(null)
            await onRefresh()
        } catch (err) {
            onStatus({ type: 'err', text: err?.response?.data?.message || err?.message || 'No se pudo guardar.' })
        } finally {
            setGuardandoEdicionGrupo(false)
        }
    }

    const ejecutarEliminarGrupo = async (id) => {
        setEliminandoGrupoId(id)
        try {
            await deleteVentasCorreoGrupo(id)
            setConfirmDeleteGrupoId(null)
            if (String(grupoIdRegistro) === String(id)) setGrupoIdRegistro('')
            onSelectedIdsChange((prev) => {
                const idsGrupo = new Set((destinatariosPorGrupo.get(id) || []).map((d) => d.id))
                const next = new Set(prev)
                idsGrupo.forEach((i) => next.delete(i))
                return next
            })
            onStatus(null)
            await onRefresh()
        } catch (err) {
            onStatus({ type: 'err', text: err?.response?.data?.message || err?.message || 'No se pudo eliminar el grupo.' })
        } finally {
            setEliminandoGrupoId(null)
        }
    }

    const handleRegistrar = async (e) => {
        e.preventDefault()
        const email = nuevoEmail.trim()
        if (!email) return
        if (!grupoIdRegistro) {
            onStatus({ type: 'err', text: 'Selecciona un grupo para el contacto.' })
            return
        }
        setGuardandoDest(true)
        try {
            const { row } = await createVentasCorreoDestinatario({
                email,
                nombre: nuevoNombre.trim() || undefined,
                grupo_id: Number(grupoIdRegistro),
            })
            onSelectedIdsChange((prev) => new Set(prev).add(row.id))
            setNuevoEmail('')
            setNuevoNombre('')
            onStatus(null)
            await onRefresh()
        } catch (err) {
            onStatus({ type: 'err', text: err?.response?.data?.message || err?.message || 'No se pudo registrar.' })
        } finally {
            setGuardandoDest(false)
        }
    }

    const ejecutarEliminarDest = async (id) => {
        setEliminandoDestId(id)
        try {
            await deleteVentasCorreoDestinatario(id)
            setConfirmDeleteDestId(null)
            onSelectedIdsChange((prev) => {
                const next = new Set(prev)
                next.delete(id)
                return next
            })
            onStatus(null)
            await onRefresh()
        } catch (err) {
            onStatus({ type: 'err', text: err?.response?.data?.message || err?.message || 'No se pudo eliminar.' })
        } finally {
            setEliminandoDestId(null)
        }
    }

    const renderTablaGrupo = (lista) => {
        if (lista.length === 0) {
            return (
                <p className="text-xs text-orange-600/70 dark:text-orange-400/60 py-3 px-2">
                    Sin contactos en este grupo.
                </p>
            )
        }

        const ids = lista.map((d) => d.id)
        const todosGrupo = ids.every((id) => selectedIds.has(id))

        return (
            <div className="overflow-x-auto rounded-lg border border-orange-100 dark:border-orange-900/50">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-xs uppercase tracking-wide text-orange-700/80 bg-orange-50/80 dark:bg-[#202020]/80 dark:text-orange-300/70">
                            <th className="p-2 w-9">
                                <input
                                    type="checkbox"
                                    checked={todosGrupo}
                                    onChange={() => toggleGrupoTodos(ids)}
                                    className="rounded border-orange-300 text-orange-700 focus:ring-orange-500"
                                    aria-label="Seleccionar grupo"
                                />
                            </th>
                            <th className="p-2 font-medium">Nombre</th>
                            <th className="p-2 font-medium">Correo</th>
                            <th className="p-2 w-14" />
                        </tr>
                    </thead>
                    <tbody>
                        {lista.map((d) => (
                            <tr
                                key={d.id}
                                className="border-t border-orange-100 dark:border-orange-900/40 hover:bg-orange-50/40 dark:hover:bg-white/[0.02]"
                            >
                                <td className="p-2">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.has(d.id)}
                                        onChange={() => toggleUno(d.id)}
                                        className="rounded border-orange-300 text-orange-700 focus:ring-orange-500"
                                    />
                                </td>
                                <td className="p-2 text-gray-800 dark:text-orange-100">{d.nombre || '—'}</td>
                                <td className="p-2 font-medium text-orange-900 dark:text-orange-200 break-all">{d.email}</td>
                                <td className="p-2 text-right">
                                    {confirmDeleteDestId === d.id ? null : (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setConfirmDeleteDestId(d.id)
                                                setConfirmDeleteGrupoId(null)
                                            }}
                                            className="text-xs text-red-600 hover:underline dark:text-red-400"
                                        >
                                            Quitar
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )
    }

    const secciones = [
        ...grupos.map((g) => ({ key: g.id, titulo: g.nombre, grupo: g, lista: destinatariosPorGrupo.get(g.id) || [] })),
    ]
    const sinGrupo = destinatariosPorGrupo.get(null) || []
    if (sinGrupo.length > 0) {
        secciones.push({ key: 'sin-grupo', titulo: 'Sin grupo', grupo: null, lista: sinGrupo })
    }

    return (
        <section className={`${card} order-1 md:order-1 md:sticky md:top-4 md:self-start md:max-h-[calc(100vh-7rem)] md:flex md:flex-col`}>
            <button
                type="button"
                className="flex w-full items-center justify-between gap-3 text-left shrink-0"
                onClick={() => onTablaAbiertaChange((o) => !o)}
                aria-expanded={tablaAbierta}
            >
                <div>
                    <h2 className="font-semibold text-gray-900 dark:text-white">Destinatarios</h2>
                    <p className="text-xs text-orange-700/70 dark:text-orange-300/60 mt-0.5">
                        {grupos.length} grupo(s) · {destinatarios.length} contacto(s) · {selectedIds.size} seleccionado(s)
                    </p>
                </div>
                <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200 transition-transform ${
                        tablaAbierta ? 'rotate-180' : ''
                    }`}
                    aria-hidden
                >
                    ▼
                </span>
            </button>

            {tablaAbierta && (
                <div className="mt-4 space-y-4 border-t border-orange-100 pt-4 dark:border-orange-900/40 md:overflow-y-auto md:min-h-0 md:flex-1">
                    <div className="rounded-xl border border-orange-100 dark:border-orange-900/50 overflow-hidden">
                        <button
                            type="button"
                            className="flex w-full items-center justify-between gap-2 px-3 py-2.5 bg-orange-50/90 dark:bg-[#202020]/90 text-left"
                            onClick={() => setCrearGrupoAbierto((o) => !o)}
                            aria-expanded={crearGrupoAbierto}
                        >
                            <span className="text-sm font-semibold text-orange-950 dark:text-white">Crear grupo</span>
                            <span
                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200 transition-transform text-xs ${
                                    crearGrupoAbierto ? 'rotate-180' : ''
                                }`}
                                aria-hidden
                            >
                                ▼
                            </span>
                        </button>

                        {crearGrupoAbierto && (
                            <div className="border-t border-orange-100 bg-orange-50/40 p-3 dark:border-orange-900/50 dark:bg-[#202020]/50">
                                <form onSubmit={handleCrearGrupo} className="flex gap-2">
                                    <Input
                                        type="text"
                                        value={nuevoGrupoNombre}
                                        onChange={(e) => setNuevoGrupoNombre(e.target.value)}
                                        placeholder="Nombre del grupo"
                                        maxLength={200}
                                        className={`${inputCls} flex-1`}
                                    />
                                    <button type="submit" className={brandBtn} style={brandStyle} disabled={guardandoGrupo}>
                                        {guardandoGrupo ? '…' : 'Crear'}
                                    </button>
                                </form>

                                {grupos.length > 0 && (
                                    <ul className="mt-3 space-y-2">
                                {grupos.map((g) => (
                                    <li
                                        key={g.id}
                                        className={`rounded-lg border px-2.5 py-2 ${
                                            confirmDeleteGrupoId === g.id
                                                ? 'border-red-300 bg-red-50/80 dark:border-red-900/50 dark:bg-red-950/20'
                                                : 'border-orange-100 bg-white dark:border-orange-900/40 dark:bg-[#262626]/80'
                                        }`}
                                    >
                                        {editandoGrupoId === g.id ? (
                                            <div className="flex flex-col gap-2">
                                                <Input
                                                    type="text"
                                                    value={editandoGrupoNombre}
                                                    onChange={(e) => setEditandoGrupoNombre(e.target.value)}
                                                    className={inputCls}
                                                    maxLength={200}
                                                />
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        className={`${brandBtn} text-xs px-3 py-1.5`}
                                                        style={brandStyle}
                                                        disabled={guardandoEdicionGrupo}
                                                        onClick={() => guardarEdicionGrupo(g.id)}
                                                    >
                                                        Guardar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={`${ghostBtn} text-xs px-3 py-1.5`}
                                                        onClick={() => {
                                                            setEditandoGrupoId(null)
                                                            setEditandoGrupoNombre('')
                                                        }}
                                                    >
                                                        Cancelar
                                                    </button>
                                                </div>
                                            </div>
                                        ) : confirmDeleteGrupoId === g.id ? (
                                            <div>
                                                <p className="text-xs font-medium text-red-900 dark:text-red-100">
                                                    ¿Eliminar «{g.nombre}» y sus {g.destinatarios_count} contacto(s)?
                                                </p>
                                                <div className="flex gap-2 mt-2">
                                                    <button
                                                        type="button"
                                                        className={`${dangerBtn} text-xs`}
                                                        disabled={eliminandoGrupoId === g.id}
                                                        onClick={() => ejecutarEliminarGrupo(g.id)}
                                                    >
                                                        {eliminandoGrupoId === g.id ? 'Eliminando…' : 'Sí, eliminar'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={`${ghostBtn} text-xs`}
                                                        onClick={() => setConfirmDeleteGrupoId(null)}
                                                    >
                                                        Cancelar
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between gap-2">
                                                <button
                                                    type="button"
                                                    className="text-left text-sm font-medium text-orange-950 dark:text-white truncate"
                                                    onClick={() => {
                                                        setGrupoIdRegistro(String(g.id))
                                                        setGruposExpandidos((prev) => new Set(prev).add(g.id))
                                                    }}
                                                >
                                                    {g.nombre}
                                                    <span className="ml-1 text-xs font-normal text-orange-600/80 dark:text-orange-400/70">
                                                        ({g.destinatarios_count})
                                                    </span>
                                                </button>
                                                <div className="flex shrink-0 flex-wrap gap-1.5 justify-end">
                                                    <button
                                                        type="button"
                                                        className={`${brandBtn} text-xs px-2.5 py-1.5 rounded-lg`}
                                                        style={brandStyle}
                                                        onClick={() => {
                                                            setEditandoGrupoId(g.id)
                                                            setEditandoGrupoNombre(g.nombre)
                                                            setConfirmDeleteGrupoId(null)
                                                        }}
                                                    >
                                                        Editar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={`${dangerBtn} text-xs px-2.5 py-1.5 rounded-lg`}
                                                        onClick={() => {
                                                            setConfirmDeleteGrupoId(g.id)
                                                            setEditandoGrupoId(null)
                                                        }}
                                                    >
                                                        Eliminar
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </li>
                                ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>

                    {grupos.length === 0 ? (
                        <p className="text-sm text-center text-orange-700/80 dark:text-orange-300/70 py-4 rounded-xl bg-orange-50/50 dark:bg-[#202020]/60">
                            Crea un grupo antes de registrar correos.
                        </p>
                    ) : (
                        <form onSubmit={handleRegistrar} className="space-y-3">
                            <VentasCorreoDesplegable
                                id="ventas-correo-grupo"
                                label="Grupo"
                                value={grupoIdRegistro}
                                options={opcionesGrupoRegistro}
                                onChange={setGrupoIdRegistro}
                                darkMode={darkMode}
                                placeholder="Selecciona un grupo"
                            />
                            <div>
                                <Label htmlFor="ventas-correo-email">Correo</Label>
                                <Input
                                    id="ventas-correo-email"
                                    type="email"
                                    required
                                    value={nuevoEmail}
                                    onChange={(e) => setNuevoEmail(e.target.value)}
                                    placeholder="contacto@escuela.edu.mx"
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
                                    placeholder="Director, coordinación…"
                                    className={inputCls}
                                />
                            </div>
                            <button type="submit" className={`${brandBtn} w-full`} style={brandStyle} disabled={guardandoDest}>
                                {guardandoDest ? 'Guardando…' : 'Registrar en el grupo'}
                            </button>
                        </form>
                    )}

                    {loading ? (
                        <p className="text-sm text-center py-6 text-orange-600/80">Cargando…</p>
                    ) : (
                        <div className="space-y-3">
                            {secciones.map(({ key, titulo, grupo, lista }) => {
                                const expandido = gruposExpandidos.has(key)
                                const ids = lista.map((d) => d.id)
                                const selCount = ids.filter((id) => selectedIds.has(id)).length

                                return (
                                    <div
                                        key={key}
                                        className="rounded-xl border border-orange-100 dark:border-orange-900/50 overflow-hidden"
                                    >
                                        <button
                                            type="button"
                                            className="flex w-full items-center justify-between gap-2 px-3 py-2.5 bg-orange-50/90 dark:bg-[#202020]/90 text-left"
                                            onClick={() => toggleExpandirGrupo(key)}
                                            aria-expanded={expandido}
                                        >
                                            <span className="font-semibold text-sm text-orange-950 dark:text-white truncate">
                                                {titulo}
                                                <span className="font-normal text-orange-600 dark:text-orange-400 ml-1">
                                                    ({lista.length}
                                                    {selCount > 0 ? ` · ${selCount} sel.` : ''})
                                                </span>
                                            </span>
                                            <span
                                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-100/80 text-orange-700 dark:bg-orange-900/30 dark:text-orange-200 text-xs transition-transform ${
                                                    expandido ? 'rotate-180' : ''
                                                }`}
                                                aria-hidden
                                            >
                                                ▼
                                            </span>
                                        </button>
                                        {expandido && (
                                            <div className="p-2">
                                                {renderTablaGrupo(lista)}
                                                {confirmDeleteDestId &&
                                                    lista.some((d) => d.id === confirmDeleteDestId) && (
                                                        <div className="mt-2 rounded-lg border border-red-200 bg-red-50/80 px-3 py-2 dark:border-red-900/50 dark:bg-red-950/25">
                                                            <p className="text-xs text-red-900 dark:text-red-100">
                                                                ¿Quitar este contacto de la lista?
                                                            </p>
                                                            <div className="flex gap-2 mt-2">
                                                                <button
                                                                    type="button"
                                                                    className={`${dangerBtn} text-xs`}
                                                                    disabled={eliminandoDestId === confirmDeleteDestId}
                                                                    onClick={() => ejecutarEliminarDest(confirmDeleteDestId)}
                                                                >
                                                                    {eliminandoDestId === confirmDeleteDestId
                                                                        ? 'Quitando…'
                                                                        : 'Sí, quitar'}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className={`${ghostBtn} text-xs`}
                                                                    onClick={() => setConfirmDeleteDestId(null)}
                                                                >
                                                                    Cancelar
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}

                            {destinatarios.length === 0 && grupos.length > 0 && (
                                <p className="text-sm text-center text-orange-600/80 py-4">
                                    Aún no hay contactos. Registra el primero arriba.
                                </p>
                            )}
                        </div>
                    )}

                    {destinatarios.length > 0 && (
                        <button type="button" className={`${ghostBtn} w-full`} onClick={toggleTodos}>
                            {todosSeleccionados ? 'Desmarcar todos' : 'Seleccionar todos'}
                        </button>
                    )}
                </div>
            )}
        </section>
    )
}
