'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from '@/lib/axios'
import { useAdminDarkMode } from '@/hooks/useAdminDarkMode'
import PasswordToggleButton from '@/components/PasswordToggleButton'

function ProgressBar({ value }) {
    return (
        <div className="w-full h-2 rounded-full bg-gray-700/50 overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
        </div>
    )
}

function TerminalBox({ title, content, darkMode }) {
    return (
        <div className={`rounded-xl border ${darkMode ? 'border-gray-700 bg-gray-900/80' : 'border-gray-300 bg-gray-50'} overflow-hidden`}>
            <div
                className={`px-4 py-2 border-b text-sm font-semibold ${
                    darkMode ? 'border-gray-700 text-emerald-300 bg-gray-800/70' : 'border-gray-300 text-emerald-700 bg-emerald-50'
                }`}
            >
                {title}
            </div>
            <div
                className={`p-4 h-56 overflow-auto font-mono text-xs whitespace-pre-wrap ${
                    darkMode ? 'text-gray-200' : 'text-gray-800'
                }`}
            >
                {content || 'Sin datos aún…'}
            </div>
        </div>
    )
}

const API_EXPORT = '/admin/catalogo-franquicias/export'
const API_IMPORT = '/admin/catalogo-franquicias/import'

export default function AdminCatalogoFranquiciasPage() {
    const darkMode = useAdminDarkMode()
    const [franchises, setFranchises] = useState([])
    const [logBox, setLogBox] = useState('Selecciona acciones para ver el registro aquí.')

    const [passwordExport, setPasswordExport] = useState('')
    const [showPasswordExport, setShowPasswordExport] = useState(false)
    const [exportFranchiseId, setExportFranchiseId] = useState('')
    const [exporting, setExporting] = useState(false)
    const [exportProgress, setExportProgress] = useState(0)
    const [exportError, setExportError] = useState('')

    const [importMode, setImportMode] = useState('update')
    const [importFranchiseId, setImportFranchiseId] = useState('')
    const [importNewName, setImportNewName] = useState('')
    const [passwordImport, setPasswordImport] = useState('')
    const [showPasswordImport, setShowPasswordImport] = useState(false)
    const [importFile, setImportFile] = useState(null)
    const [importing, setImporting] = useState(false)
    const [importProgress, setImportProgress] = useState(0)
    const [importError, setImportError] = useState('')

    const [editingId, setEditingId] = useState(null)
    const [editName, setEditName] = useState('')
    const [editDescription, setEditDescription] = useState('')
    const [editPassword, setEditPassword] = useState('')
    const [showEditPassword, setShowEditPassword] = useState(false)
    const [editSaving, setEditSaving] = useState(false)
    const [editError, setEditError] = useState('')

    const [deletingId, setDeletingId] = useState(null)
    const [deletePassword, setDeletePassword] = useState('')
    const [showDeletePassword, setShowDeletePassword] = useState(false)
    const [deleteSaving, setDeleteSaving] = useState(false)
    const [deleteError, setDeleteError] = useState('')

    const loadFranchises = useCallback(async () => {
        try {
            const { data } = await axios.get('/franchises')
            setFranchises(Array.isArray(data) ? data : [])
        } catch (e) {
            setFranchises([])
            setLogBox(`No se pudieron cargar franquicias:\n${e?.response?.data?.message || e.message}`)
        }
    }, [])

    useEffect(() => {
        loadFranchises()
    }, [loadFranchises])

    const canExport = useMemo(
        () => !exporting && passwordExport.trim().length > 0 && exportFranchiseId,
        [exporting, passwordExport, exportFranchiseId]
    )

    const canImport = useMemo(() => {
        if (importing || passwordImport.trim().length === 0 || !importFile) return false
        if (importMode === 'update' && !importFranchiseId) return false
        if (importMode === 'create' && !importNewName.trim()) return false
        return true
    }, [importing, passwordImport, importFile, importMode, importFranchiseId, importNewName])

    const getInputClass = (hasValue) =>
        darkMode
            ? `rounded-lg border px-3 py-2 text-sm transition-colors ${hasValue ? 'bg-[#E5EBFD] border-gray-600 text-gray-900' : 'bg-gray-900 border-gray-600 text-white'}`
            : `rounded-lg border px-3 py-2 text-sm transition-colors ${hasValue ? 'bg-[#E5EBFD] border-gray-300 text-gray-900' : 'bg-white border-gray-300 text-gray-900'}`

    const handleExport = async () => {
        if (!canExport) return
        setExportError('')
        setExporting(true)
        setExportProgress(12)
        const timer = setInterval(() => setExportProgress((p) => (p < 88 ? p + 9 : p)), 220)
        try {
            const response = await axios.post(
                API_EXPORT,
                { password: passwordExport, franchise_id: Number(exportFranchiseId) },
                { responseType: 'blob' }
            )
            const blob = new Blob([response.data], { type: 'application/json' })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            const cd = response.headers['content-disposition'] || ''
            const match = cd.match(/filename="?([^"]+)"?/)
            a.href = url
            a.download = match?.[1] || `franquicia_${new Date().toISOString().replace(/[:.]/g, '-')}.json`
            document.body.appendChild(a)
            a.click()
            a.remove()
            window.URL.revokeObjectURL(url)
            setExportProgress(100)
            setLogBox(`Exportación lista: franquicia #${exportFranchiseId}`)
        } catch (e) {
            setExportError(e?.response?.data?.message || 'No se pudo exportar.')
        } finally {
            clearInterval(timer)
            setTimeout(() => {
                setExporting(false)
                setExportProgress(0)
            }, 450)
        }
    }

    const handleImport = async () => {
        if (!canImport) return
        setImportError('')
        setImporting(true)
        setImportProgress(10)
        const timer = setInterval(() => setImportProgress((p) => (p < 90 ? p + 8 : p)), 260)
        try {
            const formData = new FormData()
            formData.append('password', passwordImport)
            formData.append('mode', importMode)
            if (importMode === 'update') {
                formData.append('franchise_id', String(importFranchiseId))
            } else {
                formData.append('franchise_name', importNewName.trim())
            }
            formData.append('catalog_file', importFile)

            const { data } = await axios.post(API_IMPORT, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })
            setLogBox(JSON.stringify(data?.data || data, null, 2))
            setImportProgress(100)
            await loadFranchises()
        } catch (e) {
            setImportError(e?.response?.data?.message || 'No se pudo importar el JSON.')
            const errData = e?.response?.data
            if (errData) setLogBox(JSON.stringify(errData, null, 2))
        } finally {
            clearInterval(timer)
            setTimeout(() => {
                setImporting(false)
                setImportProgress(0)
            }, 500)
        }
    }

    const startEdit = (f) => {
        setEditingId(f.id)
        setEditName(f.name || '')
        setEditDescription(f.description || '')
        setEditPassword('')
        setEditError('')
    }

    const cancelEdit = () => {
        setEditingId(null)
        setEditPassword('')
        setEditError('')
    }

    const saveEdit = async () => {
        if (!editingId || !editName.trim() || !editPassword.trim()) {
            setEditError('Nombre y contraseña son obligatorios.')
            return
        }
        setEditSaving(true)
        setEditError('')
        try {
            await axios.patch(`/admin/catalogo-franquicias/franquicias/${editingId}`, {
                password: editPassword,
                name: editName.trim(),
                description: editDescription.trim() || null,
            })
            setLogBox(`Franquicia #${editingId} actualizada.`)
            cancelEdit()
            await loadFranchises()
        } catch (e) {
            setEditError(e?.response?.data?.message || 'No se pudo guardar.')
        } finally {
            setEditSaving(false)
        }
    }

    const startDelete = (id) => {
        setDeletingId(id)
        setDeletePassword('')
        setDeleteError('')
    }

    const cancelDelete = () => {
        setDeletingId(null)
        setDeletePassword('')
        setDeleteError('')
    }

    const confirmDelete = async () => {
        if (!deletingId || !deletePassword.trim()) {
            setDeleteError('Contraseña obligatoria.')
            return
        }
        if (!window.confirm('¿Eliminar esta franquicia y todas sus estampas de referencia? Las colecciones dejarán de tener esta franquicia asignada.')) {
            return
        }
        setDeleteSaving(true)
        setDeleteError('')
        try {
            await axios.delete(`/admin/catalogo-franquicias/franquicias/${deletingId}`, {
                data: { password: deletePassword },
            })
            setLogBox(`Franquicia #${deletingId} eliminada.`)
            cancelDelete()
            await loadFranchises()
        } catch (e) {
            setDeleteError(e?.response?.data?.message || 'No se pudo eliminar.')
        } finally {
            setDeleteSaving(false)
        }
    }

    const previewJson = useMemo(() => {
        if (!franchises.length) return 'No hay franquicias registradas. Importa un catálogo o crea una desde la sección inferior.'
        return JSON.stringify(
            {
                meta: {
                    type: 'coleccionador-franchise-catalog',
                    version: 1,
                    franchise: { name: 'Ejemplo', id: '…' },
                    stamps: 'array de { player_name, country_code, dob, height, weight, stats_line, club, external_code }',
                },
            },
            null,
            2
        )
    }, [franchises.length])

    const panelClass = `rounded-xl border p-5 ${darkMode ? 'border-gray-700 bg-gray-800/60' : 'border-gray-200 bg-white'}`

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <span
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                        darkMode ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
                    }`}
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h10M4 17h16" />
                    </svg>
                </span>
                <div>
                    <h1 className={`text-2xl font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Catálogo de franquicias</h1>
                    <p className={darkMode ? 'text-gray-400 text-sm' : 'text-gray-600 text-sm'}>
                        Administra franquicias, exporta o importa JSON para el escáner (contraseña de administrador donde se indique).
                    </p>
                </div>
            </div>

            <div className={panelClass}>
                <h2 className={`text-lg font-bold mb-3 ${darkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>Franquicias registradas</h2>
                {franchises.length === 0 ? (
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>No hay franquicias aún.</p>
                ) : (
                    <ul className="space-y-2">
                        {franchises.map((f) => (
                            <li
                                key={f.id}
                                className={`flex flex-col gap-2 rounded-lg border px-3 py-2 text-sm ${
                                    darkMode ? 'border-gray-600 bg-gray-900/50' : 'border-gray-200 bg-gray-50'
                                }`}
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <span className={`font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>{f.name}</span>
                                        <span className={`ml-2 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                            {typeof f.stamps_count === 'number' ? `${f.stamps_count} estampas` : ''}
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => startEdit(f)}
                                            className="rounded-md bg-indigo-600 px-2 py-1 text-xs font-semibold text-white hover:bg-indigo-700"
                                        >
                                            Editar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => startDelete(f.id)}
                                            className="rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700"
                                        >
                                            Eliminar
                                        </button>
                                    </div>
                                </div>
                                {editingId === f.id ? (
                                    <div className={`mt-1 space-y-2 border-t pt-2 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                                        <input
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            placeholder="Nombre"
                                            className={getInputClass(!!editName.trim()) + ' w-full'}
                                        />
                                        <input
                                            value={editDescription}
                                            onChange={(e) => setEditDescription(e.target.value)}
                                            placeholder="Descripción (opcional)"
                                            className={getInputClass(!!editDescription.trim()) + ' w-full'}
                                        />
                                        <div className="relative max-w-sm">
                                            <input
                                                type={showEditPassword ? 'text' : 'password'}
                                                value={editPassword}
                                                onChange={(e) => setEditPassword(e.target.value)}
                                                placeholder="Contraseña de administrador"
                                                className={`${getInputClass(editPassword.trim())} w-full pr-11`}
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2">
                                                <PasswordToggleButton
                                                    visible={showEditPassword}
                                                    onToggle={() => setShowEditPassword((s) => !s)}
                                                />
                                            </span>
                                        </div>
                                        {editError ? <p className="text-xs text-red-500">{editError}</p> : null}
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                disabled={editSaving}
                                                onClick={saveEdit}
                                                className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                                            >
                                                {editSaving ? 'Guardando…' : 'Guardar cambios'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={cancelEdit}
                                                className={`rounded-md border px-3 py-1.5 text-xs font-bold ${
                                                    darkMode ? 'border-gray-600 text-gray-200' : 'border-gray-300 text-gray-800'
                                                }`}
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    </div>
                                ) : null}
                                {deletingId === f.id ? (
                                    <div className={`mt-1 space-y-2 border-t pt-2 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                                        <p className={`text-xs ${darkMode ? 'text-amber-200/90' : 'text-amber-800'}`}>
                                            Confirma con tu contraseña de administrador. Esta acción no se puede deshacer.
                                        </p>
                                        <div className="relative max-w-sm">
                                            <input
                                                type={showDeletePassword ? 'text' : 'password'}
                                                value={deletePassword}
                                                onChange={(e) => setDeletePassword(e.target.value)}
                                                placeholder="Contraseña de administrador"
                                                className={`${getInputClass(deletePassword.trim())} w-full pr-11`}
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2">
                                                <PasswordToggleButton
                                                    visible={showDeletePassword}
                                                    onToggle={() => setShowDeletePassword((s) => !s)}
                                                />
                                            </span>
                                        </div>
                                        {deleteError ? <p className="text-xs text-red-500">{deleteError}</p> : null}
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                disabled={deleteSaving}
                                                onClick={confirmDelete}
                                                className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                                            >
                                                {deleteSaving ? 'Eliminando…' : 'Confirmar eliminación'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={cancelDelete}
                                                className={`rounded-md border px-3 py-1.5 text-xs font-bold ${
                                                    darkMode ? 'border-gray-600 text-gray-200' : 'border-gray-300 text-gray-800'
                                                }`}
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    </div>
                                ) : null}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <TerminalBox title="Formato esperado del JSON" content={previewJson} darkMode={darkMode} />
                <TerminalBox title="Último resultado" content={logBox} darkMode={darkMode} />
            </div>

            <div className={panelClass}>
                <h2 className={`text-lg font-bold mb-3 ${darkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>Exportar catálogo JSON</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <select
                        value={exportFranchiseId}
                        onChange={(e) => setExportFranchiseId(e.target.value)}
                        className={getInputClass(!!exportFranchiseId)}
                    >
                        <option value="">Franquicia…</option>
                        {franchises.map((f) => (
                            <option key={f.id} value={f.id}>
                                {f.name}
                            </option>
                        ))}
                    </select>
                    <div className="relative">
                        <input
                            type={showPasswordExport ? 'text' : 'password'}
                            value={passwordExport}
                            onChange={(e) => setPasswordExport(e.target.value)}
                            placeholder="Contraseña de administrador"
                            className={`${getInputClass(passwordExport.trim())} w-full pr-11`}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2">
                            <PasswordToggleButton visible={showPasswordExport} onToggle={() => setShowPasswordExport((s) => !s)} />
                        </span>
                    </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={handleExport}
                        disabled={!canExport}
                        className="rounded-lg px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-50 transition-colors"
                    >
                        Descargar JSON
                    </button>
                </div>
                <div className="mt-3">
                    <ProgressBar value={exportProgress} />
                </div>
                {exportError && <p className="text-sm text-red-500 mt-2">{exportError}</p>}
            </div>

            <div className={panelClass}>
                <h2 className={`text-lg font-bold mb-3 ${darkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>Importar catálogo JSON</h2>
                <div className="flex flex-wrap gap-3 mb-3">
                    <label className={`flex items-center gap-2 text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                        <input type="radio" checked={importMode === 'create'} onChange={() => setImportMode('create')} />
                        Nueva franquicia
                    </label>
                    <label className={`flex items-center gap-2 text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                        <input type="radio" checked={importMode === 'update'} onChange={() => setImportMode('update')} />
                        Actualizar existente (reemplaza estampas)
                    </label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {importMode === 'create' ? (
                        <input
                            value={importNewName}
                            onChange={(e) => setImportNewName(e.target.value)}
                            placeholder="Nombre de la nueva franquicia"
                            className={getInputClass(!!importNewName.trim())}
                        />
                    ) : (
                        <select
                            value={importFranchiseId}
                            onChange={(e) => setImportFranchiseId(e.target.value)}
                            className={getInputClass(!!importFranchiseId)}
                        >
                            <option value="">Franquicia a actualizar…</option>
                            {franchises.map((f) => (
                                <option key={f.id} value={f.id}>
                                    {f.name}
                                </option>
                            ))}
                        </select>
                    )}
                    <input
                        type="file"
                        accept=".json,application/json,text/json"
                        onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                        className={`${getInputClass(!!importFile)} file:mr-3 file:rounded-md file:border-0 file:bg-emerald-600 file:px-3 file:py-1.5 file:text-white file:font-medium hover:file:bg-emerald-700`}
                    />
                    <div className="relative md:col-span-2">
                        <input
                            type={showPasswordImport ? 'text' : 'password'}
                            value={passwordImport}
                            onChange={(e) => setPasswordImport(e.target.value)}
                            placeholder="Contraseña de administrador"
                            className={`${getInputClass(passwordImport.trim())} w-full pr-11`}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2">
                            <PasswordToggleButton visible={showPasswordImport} onToggle={() => setShowPasswordImport((s) => !s)} />
                        </span>
                    </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={handleImport}
                        disabled={!canImport}
                        className="rounded-lg px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold disabled:opacity-50 transition-colors"
                    >
                        Importar JSON
                    </button>
                </div>
                <div className="mt-3">
                    <ProgressBar value={importProgress} />
                </div>
                {importError && <p className="text-sm text-red-500 mt-2">{importError}</p>}
            </div>
        </div>
    )
}
