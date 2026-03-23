'use client'

import { useEffect, useMemo, useState } from 'react'
import NextImage from 'next/image'
import axios from '@/lib/axios'

function ProgressBar({ value }) {
    return (
        <div className="w-full h-2 rounded-full bg-gray-700/50 overflow-hidden">
            <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
            />
        </div>
    )
}

function TerminalBox({ title, content, darkMode }) {
    return (
        <div className={`rounded-xl border ${darkMode ? 'border-gray-700 bg-gray-900/80' : 'border-gray-300 bg-gray-50'} overflow-hidden`}>
            <div className={`px-4 py-2 border-b text-sm font-semibold ${darkMode ? 'border-gray-700 text-emerald-300 bg-gray-800/70' : 'border-gray-300 text-emerald-700 bg-emerald-50'}`}>
                {title}
            </div>
            <div className={`p-4 h-72 overflow-auto font-mono text-xs whitespace-pre-wrap ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                {content || 'Sin datos aún...'}
            </div>
        </div>
    )
}

export default function AdminRespaldoPage() {
    const [darkMode, setDarkMode] = useState(true)

    const [previewTerminal, setPreviewTerminal] = useState('Cargando estructura de respaldo...')
    const [importTerminal, setImportTerminal] = useState('Aquí aparecerá el resultado de actualización del JSON.')

    const [passwordExport, setPasswordExport] = useState('')
    const [showPasswordExport, setShowPasswordExport] = useState(false)
    const [exporting, setExporting] = useState(false)
    const [exportProgress, setExportProgress] = useState(0)
    const [exportError, setExportError] = useState('')

    const [passwordImport, setPasswordImport] = useState('')
    const [showPasswordImport, setShowPasswordImport] = useState(false)
    const [selectedFile, setSelectedFile] = useState(null)
    const [importing, setImporting] = useState(false)
    const [importProgress, setImportProgress] = useState(0)
    const [importError, setImportError] = useState('')

    useEffect(() => {
        setDarkMode(JSON.parse(localStorage.getItem('darkMode') ?? 'true'))
    }, [])
    useEffect(() => {
        const onDarkModeChange = (e) => setDarkMode(!!e.detail)
        window.addEventListener('darkModeChange', onDarkModeChange)
        return () => window.removeEventListener('darkModeChange', onDarkModeChange)
    }, [])

    useEffect(() => {
        let mounted = true
        ;(async () => {
            try {
                const { data } = await axios.get('/admin/backup/preview-export')
                if (!mounted) return
                const payload = data?.data || {}
                setPreviewTerminal(JSON.stringify(payload, null, 2))
            } catch (e) {
                if (!mounted) return
                setPreviewTerminal(`Error al obtener estructura de respaldo:\n${e?.response?.data?.message || e.message}`)
            }
        })()
        return () => {
            mounted = false
        }
    }, [])

    const canExport = useMemo(() => !exporting && passwordExport.trim().length > 0, [exporting, passwordExport])
    const canImport = useMemo(
        () => !importing && passwordImport.trim().length > 0 && !!selectedFile,
        [importing, passwordImport, selectedFile]
    )

    const getInputClass = (hasValue) => darkMode
        ? `rounded-lg border px-3 py-2 text-sm transition-colors ${hasValue ? 'bg-[#E5EBFD] border-gray-600 text-gray-900' : 'bg-gray-900 border-gray-600 text-white'}`
        : `rounded-lg border px-3 py-2 text-sm transition-colors ${hasValue ? 'bg-[#E5EBFD] border-gray-300 text-gray-900' : 'bg-white border-gray-300 text-gray-900'}`

    const handleExport = async () => {
        if (!canExport) return
        setExportError('')
        setExporting(true)
        setExportProgress(10)
        const timer = setInterval(() => {
            setExportProgress((p) => (p < 90 ? p + 8 : p))
        }, 250)

        try {
            const response = await axios.post(
                '/admin/backup/export',
                { password: passwordExport },
                { responseType: 'blob' }
            )
            const blob = new Blob([response.data], { type: 'application/json' })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            const cd = response.headers['content-disposition'] || ''
            const match = cd.match(/filename="?([^"]+)"?/)
            a.href = url
            a.download = match?.[1] || `respaldo_bd_${new Date().toISOString().replace(/[:.]/g, '-')}.json`
            document.body.appendChild(a)
            a.click()
            a.remove()
            window.URL.revokeObjectURL(url)
            setExportProgress(100)
        } catch (e) {
            setExportError(e?.response?.data?.message || 'No se pudo generar el respaldo.')
        } finally {
            clearInterval(timer)
            setTimeout(() => {
                setExporting(false)
                setExportProgress(0)
            }, 500)
        }
    }

    const handleImport = async () => {
        if (!canImport) return
        setImportError('')
        setImporting(true)
        setImportProgress(8)
        const timer = setInterval(() => {
            setImportProgress((p) => (p < 92 ? p + 7 : p))
        }, 300)

        try {
            const formData = new FormData()
            formData.append('password', passwordImport)
            formData.append('backup_file', selectedFile)

            const { data } = await axios.post('/admin/backup/import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })

            setImportTerminal(JSON.stringify(data?.data || data, null, 2))
            setImportProgress(100)
        } catch (e) {
            setImportError(e?.response?.data?.message || 'No se pudo cargar/actualizar el archivo JSON.')
            const errData = e?.response?.data
            if (errData) {
                setImportTerminal(JSON.stringify(errData, null, 2))
            }
        } finally {
            clearInterval(timer)
            setTimeout(() => {
                setImporting(false)
                setImportProgress(0)
            }, 600)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${darkMode ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700'}`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-3.314 0-6 1.343-6 3v2c0 1.657 2.686 3 6 3s6-1.343 6-3v-2c0-1.657-2.686-3-6-3zm0 8c-3.314 0-6-1.343-6-3v3c0 1.657 2.686 3 6 3s6-1.343 6-3v-3c0 1.657-2.686 3-6 3z" />
                    </svg>
                </span>
                <div>
                    <h1 className={`text-2xl font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Copias de seguridad</h1>
                    <p className={darkMode ? 'text-gray-400 text-sm' : 'text-gray-600 text-sm'}>
                        Genera y carga respaldos JSON de la base de datos.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <TerminalBox
                    title="Estructura de respaldo a generar (JSON)"
                    content={previewTerminal}
                    darkMode={darkMode}
                />
                <TerminalBox
                    title="Resultado de actualización (carga JSON)"
                    content={importTerminal}
                    darkMode={darkMode}
                />
            </div>

            <div className={`rounded-xl border p-5 ${darkMode ? 'border-gray-700 bg-gray-800/60' : 'border-gray-200 bg-white'}`}>
                <h2 className={`text-lg font-bold mb-3 ${darkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>
                    Generar copia de seguridad de la base de datos
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                    <div className="relative">
                        <input
                            type={showPasswordExport ? 'text' : 'password'}
                            value={passwordExport}
                            onChange={(e) => setPasswordExport(e.target.value)}
                            placeholder="Contraseña de administrador"
                            className={`${getInputClass(passwordExport.trim())} w-full pr-11`}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPasswordExport((s) => !s)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                            aria-label={showPasswordExport ? 'Ocultar contraseña' : 'Ver contraseña'}
                        >
                            <NextImage
                                src={showPasswordExport ? '/Imagenes/icon_ojo_cerrado.png' : '/Imagenes/icon_ojo_abierto.png'}
                                alt=""
                                width={22}
                                height={22}
                                className="object-contain"
                            />
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={handleExport}
                        disabled={!canExport}
                        className="rounded-lg px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-50 transition-colors"
                    >
                        Generar JSON
                    </button>
                </div>
                <div className="mt-3">
                    <ProgressBar value={exportProgress} />
                </div>
                {exportError && <p className="text-sm text-red-500 mt-2">{exportError}</p>}
            </div>

            <div className={`rounded-xl border p-5 ${darkMode ? 'border-gray-700 bg-gray-800/60' : 'border-gray-200 bg-white'}`}>
                <h2 className={`text-lg font-bold mb-3 ${darkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>
                    Subir y actualizar archivo de base de datos
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3">
                    <input
                        type="file"
                        accept=".json,application/json,text/json"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                        className={`${getInputClass(!!selectedFile)} file:mr-3 file:rounded-md file:border-0 file:bg-emerald-600 file:px-3 file:py-1.5 file:text-white file:font-medium hover:file:bg-emerald-700`}
                    />
                    <div className="relative">
                        <input
                            type={showPasswordImport ? 'text' : 'password'}
                            value={passwordImport}
                            onChange={(e) => setPasswordImport(e.target.value)}
                            placeholder="Contraseña de administrador"
                            className={`${getInputClass(passwordImport.trim())} w-full pr-11`}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPasswordImport((s) => !s)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                            aria-label={showPasswordImport ? 'Ocultar contraseña' : 'Ver contraseña'}
                        >
                            <NextImage
                                src={showPasswordImport ? '/Imagenes/icon_ojo_cerrado.png' : '/Imagenes/icon_ojo_abierto.png'}
                                alt=""
                                width={22}
                                height={22}
                                className="object-contain"
                            />
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={handleImport}
                        disabled={!canImport}
                        className="rounded-lg px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold disabled:opacity-50 transition-colors"
                    >
                        Cargar y actualizar
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
