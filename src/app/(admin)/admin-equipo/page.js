'use client'

import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import axios from '@/lib/axios'
import Button from '@/components/Button'
import Label from '@/components/Label'
import InputError from '@/components/InputError'
import { swrFetcher } from '@/lib/swrFetcher'
import { resolvePublicidadUrl } from '@/lib/publicidad'

const KEY = '/admin/desarrolladores'
const swrConfig = { revalidateOnFocus: false, dedupingInterval: 4000 }

const emptyForm = {
    nombre: '',
    rol: '',
    descripcion: '',
    fecha_inicio: '',
    fecha_fin: '',
}

export default function AdminEquipoPage() {
    const [darkMode, setDarkMode] = useState(true)
    const [form, setForm] = useState(emptyForm)
    const [selectedFile, setSelectedFile] = useState(null)
    const [previewUrl, setPreviewUrl] = useState(null)
    const [editingId, setEditingId] = useState(null)
    const [errors, setErrors] = useState({})
    const [submitting, setSubmitting] = useState(false)
    const [deletingId, setDeletingId] = useState(null)
    const [success, setSuccess] = useState('')

    const { data: items = [], mutate } = useSWR(KEY, swrFetcher, swrConfig)

    useEffect(() => {
        setDarkMode(JSON.parse(localStorage.getItem('darkMode') ?? 'true'))
    }, [])

    useEffect(() => {
        const onDarkModeChange = (e) => setDarkMode(!!e.detail)
        window.addEventListener('darkModeChange', onDarkModeChange)
        return () => window.removeEventListener('darkModeChange', onDarkModeChange)
    }, [])

    const labelClass = darkMode ? 'text-gray-300 block mb-1.5 text-sm font-medium' : 'text-gray-700 block mb-1.5 text-sm font-medium'
    const inputClass = darkMode
        ? 'w-full px-4 py-2.5 rounded-lg border border-gray-600 bg-gray-700/80 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500'
        : 'w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500'

    /** Campos con valor: fondo #E5EBFD y texto negro (incl. fechas / calendario nativo). */
    const inputFilledClass =
        'w-full px-4 py-2.5 rounded-lg border border-[#c5d3f5] bg-[#E5EBFD] text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 [color-scheme:light]'

    const fieldClass = (hasValue) => (hasValue ? inputFilledClass : inputClass)

    const editingItem = useMemo(() => items.find((x) => x.id === editingId) || null, [items, editingId])

    const resetForm = () => {
        setForm(emptyForm)
        setSelectedFile(null)
        if (previewUrl) URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
        setEditingId(null)
        setErrors({})
    }

    const onFileChange = (e) => {
        const file = e.target.files?.[0] || null
        setSelectedFile(file)
        if (previewUrl) URL.revokeObjectURL(previewUrl)
        setPreviewUrl(file ? URL.createObjectURL(file) : null)
    }

    const onEdit = (it) => {
        setEditingId(it.id)
        setForm({
            nombre: it.nombre || '',
            rol: it.rol || '',
            descripcion: it.descripcion || '',
            fecha_inicio: it.fecha_inicio || '',
            fecha_fin: it.fecha_fin || '',
        })
        setSelectedFile(null)
        if (previewUrl) URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
        setErrors({})
    }

    const onSubmit = async (e) => {
        e.preventDefault()
        setErrors({})
        setSuccess('')
        setSubmitting(true)

        try {
            const fd = new FormData()
            fd.append('nombre', form.nombre.trim())
            fd.append('rol', form.rol.trim())
            fd.append('descripcion', form.descripcion.trim())
            fd.append('fecha_inicio', form.fecha_inicio || '')
            fd.append('fecha_fin', form.fecha_fin || '')
            if (selectedFile) fd.append('foto', selectedFile)

            if (!editingId && !selectedFile) {
                setErrors({ foto: ['Selecciona una imagen'] })
                setSubmitting(false)
                return
            }

            if (editingId) {
                fd.append('_method', 'PUT')
                await axios.post(`/admin/desarrolladores/${editingId}`, fd, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                })
                setSuccess('Integrante actualizado correctamente')
            } else {
                await axios.post('/admin/desarrolladores', fd, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                })
                setSuccess('Integrante guardado correctamente')
            }

            await mutate()
            resetForm()
            setTimeout(() => setSuccess(''), 4000)
        } catch (err) {
            const errData = err.response?.data
            setErrors(errData?.errors || { general: [errData?.message || 'Error al guardar'] })
        } finally {
            setSubmitting(false)
        }
    }

    const onDelete = async (id) => {
        setDeletingId(id)
        setErrors({})
        try {
            await axios.delete(`/admin/desarrolladores/${id}`)
            await mutate()
            if (editingId === id) resetForm()
        } catch (err) {
            setErrors({ general: [err.response?.data?.message || 'Error al eliminar'] })
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                <span
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                        darkMode ? 'bg-emerald-500/20 ring-1 ring-emerald-500/30' : 'bg-emerald-100'
                    }`}
                >
                    <img
                        src="/Imagenes/icon_equipo.png"
                        alt=""
                        className="h-7 w-7 object-contain"
                        style={{
                            filter: darkMode
                                ? 'brightness(0) saturate(100%) invert(84%) sepia(31%) saturate(638%) hue-rotate(93deg)'
                                : 'brightness(0) saturate(100%) invert(32%) sepia(98%) saturate(749%) hue-rotate(120deg)',
                        }}
                    />
                </span>
                <div>
                    <h1 className={`text-2xl font-bold tracking-tight ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Equipo de desarrollo</h1>
                    <p className={`text-sm mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Alta, edición y baja de integrantes para la vista pública de desarrolladores.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className={`rounded-xl overflow-hidden border shadow-xl ${darkMode ? 'bg-tienda-elevated border-gray-700' : 'bg-white border-gray-200'}`}>
                    <div className={`px-5 py-4 ${darkMode ? 'bg-emerald-600/25 border-b border-emerald-500/30' : 'bg-emerald-50 border-b border-emerald-200'}`}>
                        <h2 className={`text-lg font-bold ${darkMode ? 'text-emerald-200' : 'text-emerald-800'}`}>{editingId ? 'Editar integrante' : 'Registrar integrante'}</h2>
                    </div>
                    <div className="p-6">
                        <form onSubmit={onSubmit} className="space-y-4">
                            <div>
                                <Label className={labelClass}>Foto</Label>
                                <input
                                    type="file"
                                    accept="image/jpeg,image/jpg,image/png,image/webp"
                                    onChange={onFileChange}
                                    className={`block w-full rounded-lg border px-3 py-2 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium ${
                                        selectedFile || (editingId && editingItem?.foto_url)
                                            ? 'border-[#c5d3f5] bg-[#E5EBFD] text-gray-900 file:bg-emerald-600 file:text-white file:hover:bg-emerald-500 [color-scheme:light]'
                                            : darkMode
                                              ? 'border-gray-600 bg-gray-700/80 text-gray-300 file:bg-emerald-600 file:text-white file:hover:bg-emerald-500'
                                              : 'border-gray-300 bg-white text-gray-700 file:bg-emerald-600 file:text-white file:hover:bg-emerald-700'
                                    }`}
                                />
                                {previewUrl ? (
                                    <div className="mt-3 w-28 h-28 rounded-2xl overflow-hidden border border-gray-500">
                                        <img src={previewUrl} alt="Vista previa" className="w-full h-full object-cover" />
                                    </div>
                                ) : editingItem?.foto_url ? (
                                    <div className="mt-3 w-28 h-28 rounded-2xl overflow-hidden border border-gray-500">
                                        <img src={resolvePublicidadUrl(editingItem.foto_url)} alt="Foto actual" className="w-full h-full object-cover" />
                                    </div>
                                ) : null}
                                <InputError messages={errors.foto} />
                            </div>

                            <div>
                                <Label className={labelClass}>Rol</Label>
                                <input
                                    type="text"
                                    className={fieldClass(!!form.rol.trim())}
                                    value={form.rol}
                                    onChange={(e) => setForm((p) => ({ ...p, rol: e.target.value }))}
                                />
                                <InputError messages={errors.rol} />
                            </div>
                            <div>
                                <Label className={labelClass}>Nombre</Label>
                                <input
                                    type="text"
                                    className={fieldClass(!!form.nombre.trim())}
                                    value={form.nombre}
                                    onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                                />
                                <InputError messages={errors.nombre} />
                            </div>
                            <div>
                                <Label className={labelClass}>Descripción</Label>
                                <textarea
                                    className={fieldClass(!!form.descripcion.trim())}
                                    rows={4}
                                    value={form.descripcion}
                                    onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
                                />
                                <InputError messages={errors.descripcion} />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <Label className={labelClass}>Fecha inicio</Label>
                                    <input
                                        type="date"
                                        className={fieldClass(!!form.fecha_inicio)}
                                        value={form.fecha_inicio}
                                        onChange={(e) => setForm((p) => ({ ...p, fecha_inicio: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <Label className={labelClass}>Fecha fin (opcional)</Label>
                                    <input
                                        type="date"
                                        className={fieldClass(!!form.fecha_fin)}
                                        value={form.fecha_fin}
                                        onChange={(e) => setForm((p) => ({ ...p, fecha_fin: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <InputError messages={errors.fecha_fin} />

                            {success ? <p className="text-sm text-emerald-500 font-medium">{success}</p> : null}
                            <InputError messages={errors.general} />

                            <div className="flex gap-3">
                                <Button
                                    type="submit"
                                    disabled={submitting}
                                    className={`py-3 px-6 rounded-lg font-semibold ${darkMode ? '!bg-emerald-500 hover:!bg-emerald-400' : '!bg-emerald-600 hover:!bg-emerald-700'} text-white`}
                                >
                                    {submitting ? 'Guardando...' : editingId ? 'Actualizar' : 'Guardar'}
                                </Button>
                                {editingId ? (
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className={`py-3 px-6 rounded-lg font-semibold border ${darkMode ? 'border-gray-600 text-gray-200 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}
                                    >
                                        Cancelar edicion
                                    </button>
                                ) : null}
                            </div>
                        </form>
                    </div>
                </div>

                <div className={`rounded-xl overflow-hidden border shadow-xl ${darkMode ? 'bg-tienda-elevated border-gray-700' : 'bg-white border-gray-200'}`}>
                    <div className={`px-5 py-4 ${darkMode ? 'bg-gray-700/50 border-b border-gray-600' : 'bg-gray-50 border-b border-gray-200'}`}>
                        <h2 className={`text-lg font-bold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Integrantes registrados ({items.length})</h2>
                    </div>
                    <div className="p-4 max-h-[720px] overflow-y-auto space-y-3">
                        {items.length === 0 ? (
                            <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>No hay integrantes registrados.</p>
                        ) : items.map((it) => (
                            <article key={it.id} className={`rounded-xl border p-4 ${darkMode ? 'border-gray-600 bg-gray-700/40' : 'border-gray-200 bg-gray-50'}`}>
                                <div className="flex gap-4">
                                    <div className="w-20 h-20 rounded-xl overflow-hidden border border-gray-500 shrink-0">
                                        <img src={resolvePublicidadUrl(it.foto_url)} alt={it.nombre} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className={`text-xs uppercase tracking-wider font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{it.rol}</p>
                                        <h3 className={`font-semibold truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>{it.nombre}</h3>
                                        <p className={`text-sm mt-1 line-clamp-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{it.descripcion}</p>
                                        <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                            {it.fecha_inicio || '-'} a {it.fecha_fin || 'Actual'}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-3 flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => onEdit(it)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${darkMode ? 'border-amber-400/40 text-amber-300 hover:bg-amber-500/20' : 'border-amber-300 text-amber-700 hover:bg-amber-50'}`}
                                    >
                                        Editar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onDelete(it.id)}
                                        disabled={deletingId === it.id}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${darkMode ? 'border-red-500/40 text-red-300 hover:bg-red-500/20' : 'border-red-300 text-red-700 hover:bg-red-50'}`}
                                    >
                                        {deletingId === it.id ? 'Eliminando...' : 'Eliminar'}
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

