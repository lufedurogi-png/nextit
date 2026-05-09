'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import axios from '@/lib/axios'
import PageFade from '@/components/coleccionador/PageFade'
import { storageUrl } from '@/lib/storageUrl'

export default function ComunidadPage() {
    const [groups, setGroups] = useState([])
    const [error, setError] = useState('')
    const [createOpen, setCreateOpen] = useState(false)
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [includeRules, setIncludeRules] = useState(false)
    const [ruleList, setRuleList] = useState([''])
    const [accentColor, setAccentColor] = useState('#8b5cf6')
    const [coverEntry, setCoverEntry] = useState(null)
    const coverInputRef = useRef(null)
    const [saving, setSaving] = useState(false)
    const [success, setSuccess] = useState('')
    const [joinGroup, setJoinGroup] = useState(null)
    const [confirmJoinOpen, setConfirmJoinOpen] = useState(false)
    const [joining, setJoining] = useState(false)
    const [groupsTab, setGroupsTab] = useState('mine')

    const loadGroups = useCallback(async () => {
        try {
            const { data } = await axios.get('/groups')
            setGroups(Array.isArray(data) ? data : [])
            setError('')
        } catch {
            setError('No se pudieron cargar los grupos.')
        }
    }, [])

    useEffect(() => {
        loadGroups()
    }, [loadGroups])

    const clearCoverEntry = useCallback(() => {
        setCoverEntry((prev) => {
            if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl)
            return null
        })
    }, [])

    useEffect(
        () => () => {
            clearCoverEntry()
        },
        [clearCoverEntry]
    )

    const createGroup = async () => {
        if (!name.trim() || saving) return
        setSaving(true)
        setError('')
        setSuccess('')
        try {
            let coverPath = null
            if (coverEntry?.file) {
                const fd = new FormData()
                fd.append('file', coverEntry.file)
                const up = await axios.post('/uploads', fd)
                coverPath = up.data?.path || null
            }

            const parsedRules = includeRules ? ruleList.map((r) => r.trim()).filter(Boolean) : []
            await axios.post('/groups', {
                name: name.trim(),
                description: description.trim() || null,
                rules: parsedRules.length ? parsedRules.join('\n') : null,
                accent_color: accentColor,
                cover_path: coverPath,
            })

            setName('')
            setDescription('')
            setIncludeRules(false)
            setRuleList([''])
            setAccentColor('#8b5cf6')
            clearCoverEntry()
            if (coverInputRef.current) coverInputRef.current.value = ''
            setCreateOpen(false)
            setSuccess('Grupo creado. Ya aparece en “Mis grupos”.')
            await loadGroups()
        } catch {
            setError('No se pudo crear el grupo.')
        } finally {
            setSaving(false)
        }
    }

    const myGroups = useMemo(() => groups.filter((g) => g.is_member), [groups])
    const discoverGroups = useMemo(() => groups.filter((g) => !g.is_member), [groups])
    const joinRules = useMemo(() => {
        if (!joinGroup?.rules) return []
        return String(joinGroup.rules)
            .split('\n')
            .map((r) => r.trim())
            .filter(Boolean)
    }, [joinGroup?.rules])

    const confirmJoin = async () => {
        if (!joinGroup?.id || joining) return
        setJoining(true)
        try {
            await axios.post(`/groups/${joinGroup.id}/join`)
            setConfirmJoinOpen(false)
            setJoinGroup(null)
            setSuccess(`Te uniste a "${joinGroup.name}". Ya aparece en “Mis grupos”.`)
            await loadGroups()
        } catch {
            setError('No se pudo completar la unión al grupo.')
        } finally {
            setJoining(false)
        }
    }

    /** En el modal: si hay reglas, pide confirmación; si no, une al instante. */
    const requestJoinFromModal = () => {
        if (!joinGroup) return
        if (joinRules.length > 0) {
            setConfirmJoinOpen(true)
        } else {
            confirmJoin()
        }
    }

    return (
        <PageFade>
            <div className="relative z-[1] mx-auto max-w-6xl space-y-3 px-4 pb-14 pt-4">
                {error ? <p className="text-sm text-red-600">{error}</p> : null}
                {success ? <p className="text-sm font-semibold text-emerald-600">{success}</p> : null}
                <section className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Crear grupo</p>
                            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Crea una comunidad y administra miembros y publicaciones.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setCreateOpen((v) => !v)}
                            className="rounded-2xl bg-[var(--app-accent)] px-4 py-2 text-xs font-extrabold text-white"
                        >
                            {createOpen ? 'Ocultar formulario' : 'Crear nuevo grupo'}
                        </button>
                    </div>

                    {createOpen ? (
                        <div className="mt-3 space-y-3 border-t border-slate-200 pt-3 dark:border-slate-700">
                            <div className="grid gap-2 sm:grid-cols-2">
                                <input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Nombre del grupo"
                                    className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
                                />
                                <input
                                    ref={coverInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="sr-only"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0]
                                        const input = e.target
                                        window.queueMicrotask(() => {
                                            input.value = ''
                                        })
                                        if (!file) return
                                        clearCoverEntry()
                                        setCoverEntry({ file, previewUrl: URL.createObjectURL(file) })
                                    }}
                                />
                                <div className="rounded-2xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-950">
                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-300">Portada</p>
                                    <div className="mt-2 flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => coverInputRef.current?.click()}
                                            className="rounded-xl border-2 border-dashed border-slate-300 px-3 py-1.5 text-xs font-bold text-[var(--app-accent)] dark:border-slate-600"
                                        >
                                            Elegir imagen
                                        </button>
                                        {coverEntry ? (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    clearCoverEntry()
                                                    if (coverInputRef.current) coverInputRef.current.value = ''
                                                }}
                                                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 dark:border-slate-600 dark:text-slate-300"
                                            >
                                                Quitar
                                            </button>
                                        ) : null}
                                    </div>
                                </div>
                            </div>

                            {coverEntry ? (
                                <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-950">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={coverEntry.previewUrl} alt="" className="h-16 w-24 rounded-xl object-cover" />
                                    <p className="text-xs text-slate-500">Vista previa de portada</p>
                                </div>
                            ) : null}

                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                                placeholder="Descripción"
                                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
                            />

                            <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Reglas</p>
                                    <button
                                        type="button"
                                        onClick={() => setIncludeRules((v) => !v)}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${includeRules ? 'bg-[var(--app-accent)]' : 'bg-slate-300 dark:bg-slate-700'}`}
                                        aria-pressed={includeRules}
                                    >
                                        <span
                                            className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${includeRules ? 'translate-x-5' : 'translate-x-0.5'}`}
                                        />
                                    </button>
                                </div>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    {includeRules ? 'Agrega una o varias reglas para moderar el grupo.' : 'Sin reglas: el grupo se crea solo con nombre, descripción y color.'}
                                </p>

                                {includeRules ? (
                                    <div className="mt-3 space-y-2">
                                        {ruleList.map((rule, idx) => (
                                            <div key={`rule-${idx}`} className="flex items-center gap-2">
                                                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--app-accent)]/15 text-xs font-black text-[var(--app-accent)]">
                                                    {idx + 1}
                                                </span>
                                                <input
                                                    value={rule}
                                                    onChange={(e) => {
                                                        const next = [...ruleList]
                                                        next[idx] = e.target.value
                                                        setRuleList(next)
                                                    }}
                                                    placeholder={`Regla ${idx + 1}`}
                                                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50"
                                                />
                                                {ruleList.length > 1 ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => setRuleList(ruleList.filter((_, ruleIdx) => ruleIdx !== idx))}
                                                        className="rounded-lg border border-red-200 px-2 py-1 text-xs font-bold text-red-600 dark:border-red-900/60 dark:text-red-400"
                                                    >
                                                        Quitar
                                                    </button>
                                                ) : null}
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => setRuleList((prev) => [...prev, ''])}
                                            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 dark:border-slate-600 dark:text-slate-300"
                                        >
                                            + Agregar regla
                                        </button>
                                    </div>
                                ) : null}
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <label className="text-xs font-bold text-slate-500">Color</label>
                                <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="h-9 w-12 rounded-xl border" />
                                <button
                                    type="button"
                                    onClick={createGroup}
                                    disabled={saving || !name.trim()}
                                    className="ml-auto rounded-2xl bg-[var(--app-accent)] px-4 py-2 text-sm font-extrabold text-white disabled:opacity-50"
                                >
                                    {saving ? 'Creando…' : 'Crear grupo'}
                                </button>
                            </div>
                        </div>
                    ) : null}
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white/90 p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                    <div className="grid grid-cols-2 gap-1 text-xs font-bold">
                        <button
                            type="button"
                            aria-pressed={groupsTab === 'mine'}
                            onClick={() => setGroupsTab('mine')}
                            className={`rounded-xl px-3 py-2 ${
                                groupsTab === 'mine' ? 'bg-[var(--app-accent)] text-white' : 'text-slate-600 dark:text-slate-400'
                            }`}
                        >
                            Mis grupos
                        </button>
                        <button
                            type="button"
                            aria-pressed={groupsTab === 'explore'}
                            onClick={() => setGroupsTab('explore')}
                            className={`rounded-xl px-3 py-2 ${
                                groupsTab === 'explore' ? 'bg-[var(--app-accent)] text-white' : 'text-slate-600 dark:text-slate-400'
                            }`}
                        >
                            Explorar grupos
                        </button>
                    </div>
                </section>

                {groupsTab === 'mine' ? (
                    <section className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                        <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Mis grupos</p>
                        {myGroups.length === 0 ? <p className="mt-2 text-sm text-slate-500">Aún no te has unido a grupos.</p> : null}
                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {myGroups.map((g, idx) => (
                                <motion.div
                                    key={`my-${g.id}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.03 * idx }}
                                >
                                    <Link
                                        href={`/comunidad/${g.id}`}
                                        aria-label={`Abrir grupo ${g.name}`}
                                        className="block overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-900/80 dark:focus-visible:ring-offset-slate-950"
                                    >
                                        <div className="relative h-28 bg-slate-100 dark:bg-slate-800">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={g.cover_path ? storageUrl(g.cover_path) : '/Imagenes/caja.png'} alt="" className="h-full w-full object-cover" />
                                        </div>
                                        <div className="p-3">
                                            <div className="mb-2 h-1.5 w-full rounded-full" style={{ backgroundColor: g.accent_color || '#8b5cf6' }} />
                                            <p className="truncate text-sm font-extrabold text-slate-900 dark:text-slate-50">{g.name}</p>
                                            <p className="mt-1 text-xs text-slate-500">{g.members_count ?? 0} miembros</p>
                                            <div className="mt-2 flex items-center justify-between gap-2">
                                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                                    {g.my_role || 'miembro'}
                                                </span>
                                                <span className="pointer-events-none rounded-full bg-[var(--app-accent)] px-3 py-1.5 text-xs font-extrabold text-white">
                                                    Abrir
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                </motion.div>
                            ))}
                        </div>
                    </section>
                ) : null}

                {groupsTab === 'explore' ? (
                    <section className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                        <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Explorar grupos</p>
                        {discoverGroups.length === 0 ? <p className="mt-2 text-sm text-slate-500">Por ahora no hay más grupos por descubrir.</p> : null}
                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {discoverGroups.map((g, idx) => (
                                <motion.div
                                    key={`explore-${g.id}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.03 * idx }}
                                >
                                    <button
                                        type="button"
                                        aria-label={`Unirte al grupo ${g.name}`}
                                        className="block w-full cursor-pointer overflow-hidden rounded-3xl border border-slate-200 bg-white/95 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-900/75 dark:focus-visible:ring-offset-slate-950"
                                        onClick={() => {
                                            setConfirmJoinOpen(false)
                                            setJoinGroup(g)
                                        }}
                                    >
                                        <div className="relative h-32 bg-slate-100 dark:bg-slate-800">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={g.cover_path ? storageUrl(g.cover_path) : '/Imagenes/caja.png'} alt="" className="h-full w-full object-cover" />
                                            <div
                                                className="absolute inset-x-0 bottom-0 h-16 opacity-60"
                                                style={{ background: `linear-gradient(to top, ${g.accent_color || '#8b5cf6'}66, transparent)` }}
                                            />
                                        </div>
                                        <div className="p-4">
                                            <p className="text-sm font-extrabold text-slate-900 dark:text-slate-50">{g.name}</p>
                                            <p className="mt-1 line-clamp-2 text-xs text-slate-600 dark:text-slate-300">{g.description || 'Sin descripción.'}</p>
                                            <p className="mt-2 text-xs text-slate-500">Creador: <span className="font-bold">{g.owner?.name || 'Usuario'}</span></p>
                                            <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{g.members_count ?? 0} miembros</p>
                                            <div className="mt-3 flex items-center gap-2">
                                                <span className="pointer-events-none rounded-full border border-[var(--app-accent)] px-3 py-1.5 text-xs font-black text-[var(--app-accent)]">
                                                    Unirme
                                                </span>
                                            </div>
                                        </div>
                                    </button>
                                </motion.div>
                            ))}
                        </div>
                    </section>
                ) : null}

                {joinGroup ? (
                    <div className="fixed inset-0 z-[320] flex items-end justify-center p-2 md:items-center md:pl-72 md:pr-6 md:py-6">
                        <button
                            type="button"
                            aria-label="Cerrar"
                            className="absolute inset-0 bg-transparent"
                            onClick={() => {
                                setConfirmJoinOpen(false)
                                setJoinGroup(null)
                            }}
                        />
                        <div
                            role="dialog"
                            aria-modal="true"
                            className="relative z-[1] max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-600 dark:bg-slate-900"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Unirse al grupo</p>
                                    <p className="mt-1 text-sm font-extrabold text-slate-900 dark:text-slate-50">{joinGroup.name}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setConfirmJoinOpen(false)
                                        setJoinGroup(null)
                                    }}
                                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold dark:border-slate-600"
                                >
                                    Cerrar
                                </button>
                            </div>

                            <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-600">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={joinGroup.cover_path ? storageUrl(joinGroup.cover_path) : '/Imagenes/caja.png'} alt="" className="h-36 w-full object-cover" />
                            </div>

                            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{joinGroup.description || 'Sin descripción.'}</p>

                            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/60">
                                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Reglas del grupo</p>
                                {joinRules.length ? (
                                    <ul className="mt-2 space-y-1.5">
                                        {joinRules.map((rule, idx) => (
                                            <li key={`${joinGroup.id}-rule-${idx}`} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
                                                <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--app-accent)]/15 text-[11px] font-black text-[var(--app-accent)]">
                                                    {idx + 1}
                                                </span>
                                                <span>{rule}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="mt-2 text-xs text-slate-500">Este grupo no tiene reglas obligatorias.</p>
                                )}
                            </div>

                            <div className="mt-4 flex items-center gap-2">
                                <button type="button" onClick={requestJoinFromModal} className="rounded-2xl bg-[var(--app-accent)] px-4 py-2 text-xs font-extrabold text-white">
                                    Unirme
                                </button>
                            </div>
                        </div>
                    </div>
                ) : null}

                {joinGroup && confirmJoinOpen ? (
                    <div className="fixed inset-0 z-[330] flex items-center justify-center p-3 md:pl-72 md:pr-6">
                        <button type="button" aria-label="Cerrar confirmación" className="absolute inset-0 bg-transparent" onClick={() => setConfirmJoinOpen(false)} />
                        <div className="relative z-[1] w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-600 dark:bg-slate-900">
                            <p className="text-sm font-extrabold text-slate-900 dark:text-slate-50">
                                {joinRules.length ? '¿Estás de acuerdo con cumplir el reglamento del grupo?' : '¿Confirmas unirte a este grupo?'}
                            </p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">{joinGroup.name}</p>
                            <div className="mt-4 flex gap-2">
                                <button
                                    type="button"
                                    onClick={confirmJoin}
                                    disabled={joining}
                                    className="rounded-2xl bg-[var(--app-accent)] px-4 py-2 text-xs font-extrabold text-white disabled:opacity-60"
                                >
                                    {joining ? 'Uniendo…' : 'Confirmar'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setConfirmJoinOpen(false)}
                                    disabled={joining}
                                    className="rounded-2xl border border-slate-200 px-4 py-2 text-xs font-bold dark:border-slate-600"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>
        </PageFade>
    )
}
