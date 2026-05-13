'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import useSWR from 'swr'
import axios from '@/lib/axios'
import { resolvePublicidadUrl } from '@/lib/publicidad'
import Button from '@/components/Button'
import Input from '@/components/Input'
import InputError from '@/components/InputError'
import Label from '@/components/Label'
import SwitchToggle from '@/components/SwitchToggle'
import { swrFetcher } from '@/lib/swrFetcher'
import {
    getCategoriasPrincipales,
    getFiltrosDinamicos,
    getFiltrosDinamicosBusqueda,
    getMarcas,
    getProductos,
} from '@/lib/productos'

const PUBLICIDAD_KEY = '/admin/publicidad'
const PROMOCIONES_KEY = '/admin/promociones'
const swrConfig = { revalidateOnFocus: false, dedupingInterval: 5000 }

function PasswordModal({ open, title, darkMode, loading, error, onClose, onConfirm }) {
    const [pw, setPw] = useState('')
    useEffect(() => {
        if (open) setPw('')
    }, [open])
    if (!open) return null
    const box = darkMode ? 'bg-tienda-elevated border-gray-600 text-gray-100' : 'bg-white border-gray-200 text-gray-900'
    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
            role="dialog"
            aria-modal="true"
            onClick={onClose}
        >
            <div className={`max-w-md w-full rounded-xl border shadow-2xl p-6 ${box}`} onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-bold mb-2">{title}</h3>
                <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Introduce la contraseña del administrador en sesión para continuar.
                </p>
                <input
                    type="password"
                    autoComplete="current-password"
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border mb-3 ${
                        darkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                    placeholder="Contraseña"
                />
                {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
                <div className="flex gap-2 justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className={`px-4 py-2 rounded-lg text-sm font-medium ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        disabled={loading || !pw}
                        onClick={() => onConfirm(pw)}
                        className="px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white disabled:opacity-50"
                    >
                        {loading ? '…' : 'Confirmar'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default function AdminPublicidad() {
    const [darkMode, setDarkMode] = useState(true)
    const [selectedFile, setSelectedFile] = useState(null)
    const [titulo, setTitulo] = useState('')
    const [enlaceBanner, setEnlaceBanner] = useState('')
    const [passwordBanner, setPasswordBanner] = useState('')
    const [uploading, setUploading] = useState(false)
    const [errors, setErrors] = useState({})
    const [success, setSuccess] = useState('')
    const [previewUrl, setPreviewUrl] = useState(null)

    const [carruselLocal, setCarruselLocal] = useState(true)
    const [passwordCarrusel, setPasswordCarrusel] = useState('')
    const [savingCarrusel, setSavingCarrusel] = useState(false)

    const { data: pubData, mutate: mutatePub } = useSWR(PUBLICIDAD_KEY, swrFetcher, swrConfig)
    const carruselActivo = pubData?.carrusel_activo ?? true
    const imagenes = pubData?.imagenes ?? []

    useEffect(() => {
        setCarruselLocal(!!pubData?.carrusel_activo)
    }, [pubData?.carrusel_activo])

    const { data: promocionesList = [], mutate: mutatePromos } = useSWR(PROMOCIONES_KEY, swrFetcher, swrConfig)
    const [promoNuevaTitulo, setPromoNuevaTitulo] = useState('')
    const [promoNuevaDesc, setPromoNuevaDesc] = useState('')
    const [promoNuevaSlug, setPromoNuevaSlug] = useState('')
    const [passwordPromoCrear, setPasswordPromoCrear] = useState('')
    const [creandoPromo, setCreandoPromo] = useState(false)
    /** Líneas del borrador de la nueva promoción (solo en cliente hasta "Crear promoción"). */
    const [draftLineas, setDraftLineas] = useState([])
    const [promoSeleccionadaId, setPromoSeleccionadaId] = useState(null)
    const [passwordPromoAcciones, setPasswordPromoAcciones] = useState('')

    const { data: promoDetalle, mutate: mutatePromoDetalle } = useSWR(
        promoSeleccionadaId ? `/admin/promociones/${promoSeleccionadaId}` : null,
        swrFetcher,
        swrConfig
    )

    const [categorias, setCategorias] = useState([])
    const [catPrincipal, setCatPrincipal] = useState('')
    const [subcategoria, setSubcategoria] = useState('')
    const [marca, setMarca] = useState('')
    const [marcasOpts, setMarcasOpts] = useState([])
    const [soloStock, setSoloStock] = useState(false)
    const [busquedaQ, setBusquedaQ] = useState('')
    const [filtrosDinamicos, setFiltrosDinamicos] = useState({})
    const [filtrosVals, setFiltrosVals] = useState({})
    const [productosBusqueda, setProductosBusqueda] = useState([])
    const [totalBusqueda, setTotalBusqueda] = useState(0)
    const [pageBusqueda, setPageBusqueda] = useState(1)
    const [loadingBusqueda, setLoadingBusqueda] = useState(false)

    const [modal, setModal] = useState({ open: false, title: '', loading: false, error: '', onConfirm: null })

    useEffect(() => {
        setDarkMode(JSON.parse(localStorage.getItem('darkMode') ?? 'true'))
    }, [])
    useEffect(() => {
        const onDarkModeChange = (e) => setDarkMode(!!e.detail)
        window.addEventListener('darkModeChange', onDarkModeChange)
        return () => window.removeEventListener('darkModeChange', onDarkModeChange)
    }, [])

    useEffect(() => {
        getCategoriasPrincipales().then((c) => setCategorias(Array.isArray(c) ? c : []))
    }, [])

    const subOpciones = useMemo(() => {
        const cat = categorias.find((c) => c.id === catPrincipal)
        if (!cat) return []
        const subs = Array.isArray(cat.subcategorias) ? cat.subcategorias : []
        return subs
    }, [categorias, catPrincipal])

    const filtrosActivos = useMemo(
        () => Object.fromEntries(Object.entries(filtrosVals).filter(([, v]) => v != null && String(v).trim() !== '')),
        [filtrosVals]
    )

    useEffect(() => {
        setFiltrosVals({})
    }, [catPrincipal, subcategoria])

    const cargarMarcasYFiltros = useCallback(async () => {
        try {
            let m = []
            if (catPrincipal && subcategoria === 'ver-todo') {
                m = await getMarcas({ categoria_principal: catPrincipal })
            } else if (subcategoria && subcategoria !== 'ver-todo') {
                m = await getMarcas({ grupo: subcategoria })
            } else {
                m = await getMarcas()
            }
            setMarcasOpts(Array.isArray(m) ? m : [])
            if (busquedaQ.trim()) {
                const fd = await getFiltrosDinamicosBusqueda(busquedaQ, {
                    marca,
                    soloConStock: soloStock,
                    filtros: filtrosActivos,
                })
                setFiltrosDinamicos(fd && typeof fd === 'object' ? fd : {})
            } else if (catPrincipal && subcategoria) {
                const fd = await getFiltrosDinamicos(catPrincipal, subcategoria, {
                    marca,
                    soloConStock: soloStock,
                    filtros: filtrosActivos,
                })
                setFiltrosDinamicos(fd && typeof fd === 'object' ? fd : {})
            } else {
                setFiltrosDinamicos({})
            }
        } catch {
            setMarcasOpts([])
            setFiltrosDinamicos({})
        }
    }, [catPrincipal, subcategoria, marca, soloStock, busquedaQ, filtrosActivos])

    useEffect(() => {
        cargarMarcasYFiltros()
    }, [cargarMarcasYFiltros])

    const ejecutarBusquedaProductos = useCallback(
        async (pageOverride) => {
            const page = pageOverride ?? pageBusqueda
            setLoadingBusqueda(true)
            try {
                const filtros = { ...filtrosActivos }
                const params = {
                    page,
                    per_page: 12,
                }
                if (soloStock) params.solo_con_stock = true
                if (marca) params.marca = marca
                if (busquedaQ.trim()) params.busqueda_q = busquedaQ.trim()
                if (catPrincipal && subcategoria === 'ver-todo') params.categoria_principal = catPrincipal
                if (subcategoria && subcategoria !== 'ver-todo') params.grupo = subcategoria
                if (Object.keys(filtros).length) params.filtros = filtros
                const data = await getProductos(params)
                setProductosBusqueda(data?.productos ?? [])
                setTotalBusqueda(data?.total ?? 0)
                setPageBusqueda(page)
                setErrors((prev) => {
                    const next = { ...prev }
                    delete next.general
                    return next
                })
            } catch {
                setErrors((prev) => ({
                    ...prev,
                    general: ['Error al buscar productos'],
                }))
            } finally {
                setLoadingBusqueda(false)
            }
        },
        [pageBusqueda, soloStock, marca, busquedaQ, catPrincipal, subcategoria, filtrosActivos]
    )

    /** Resultados del catálogo: se actualizan solos al elegir categoría + subcategoría, o con texto de búsqueda (≥2 caracteres), y al cambiar marca, stock o filtros dinámicos. */
    useEffect(() => {
        const hasCatSub = Boolean(catPrincipal && subcategoria)
        const q = busquedaQ.trim()
        const hasBusqueda = q.length >= 2

        if (!hasCatSub && !hasBusqueda) {
            setProductosBusqueda([])
            setTotalBusqueda(0)
            setLoadingBusqueda(false)
            return undefined
        }

        const delay = hasBusqueda && !hasCatSub ? 450 : hasBusqueda ? 320 : 220
        const t = setTimeout(async () => {
            setLoadingBusqueda(true)
            try {
                const filtros = { ...filtrosActivos }
                const params = {
                    page: 1,
                    per_page: 12,
                }
                if (soloStock) params.solo_con_stock = true
                if (marca) params.marca = marca
                if (q) params.busqueda_q = q
                if (catPrincipal && subcategoria === 'ver-todo') params.categoria_principal = catPrincipal
                if (subcategoria && subcategoria !== 'ver-todo') params.grupo = subcategoria
                if (Object.keys(filtros).length) params.filtros = filtros
                const data = await getProductos(params)
                setProductosBusqueda(data?.productos ?? [])
                setTotalBusqueda(data?.total ?? 0)
                setPageBusqueda(1)
                setErrors((prev) => {
                    const next = { ...prev }
                    delete next.general
                    return next
                })
            } catch {
                setErrors((prev) => ({
                    ...prev,
                    general: ['Error al buscar productos'],
                }))
            } finally {
                setLoadingBusqueda(false)
            }
        }, delay)
        return () => clearTimeout(t)
    }, [catPrincipal, subcategoria, marca, soloStock, filtrosActivos, busquedaQ])

    const handleFileChange = (e) => {
        const file = e.target.files?.[0]
        setSelectedFile(file)
        setErrors({})
        setSuccess('')
        if (previewUrl) URL.revokeObjectURL(previewUrl)
        setPreviewUrl(file ? URL.createObjectURL(file) : null)
    }

    const handleGuardar = async (e) => {
        e.preventDefault()
        if (!selectedFile) {
            setErrors({ imagen: ['Selecciona una imagen'] })
            return
        }
        if (!passwordBanner.trim()) {
            setErrors({ admin_password: ['La contraseña es obligatoria para subir un banner'] })
            return
        }
        setErrors({})
        setSuccess('')
        setUploading(true)
        try {
            const formData = new FormData()
            formData.append('imagen', selectedFile)
            formData.append('admin_password', passwordBanner)
            if (titulo.trim()) formData.append('titulo', titulo.trim())
            if (enlaceBanner.trim()) formData.append('enlace', enlaceBanner.trim())

            const res = await axios.post('/admin/publicidad', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })
            if (res.data?.success) {
                setSuccess('Imagen guardada correctamente')
                setSelectedFile(null)
                setTitulo('')
                setEnlaceBanner('')
                setPasswordBanner('')
                if (previewUrl) {
                    URL.revokeObjectURL(previewUrl)
                    setPreviewUrl(null)
                }
                e.target.reset()
                await mutatePub()
                setTimeout(() => setSuccess(''), 4000)
            } else {
                setErrors({ general: [res.data?.message || 'Error al guardar'] })
            }
        } catch (err) {
            const errData = err.response?.data
            setErrors(errData?.errors || { general: [errData?.message || 'Error al subir la imagen'] })
        } finally {
            setUploading(false)
        }
    }

    const abrirModalEliminar = (id) => {
        setModal({
            open: true,
            title: 'Eliminar imagen del carrusel',
            loading: false,
            error: '',
            onConfirm: async (pw) => {
                setModal((m) => ({ ...m, loading: true, error: '' }))
                try {
                    await axios.delete(`/admin/publicidad/${id}`, { data: { admin_password: pw } })
                    await mutatePub()
                    setModal({ open: false, title: '', loading: false, error: '', onConfirm: null })
                } catch (err) {
                    const msg = err.response?.data?.errors?.admin_password?.[0] || err.response?.data?.message || 'Error al eliminar'
                    setModal((m) => ({ ...m, loading: false, error: msg }))
                }
            },
        })
    }

    const guardarCarrusel = async () => {
        if (!passwordCarrusel.trim()) {
            setErrors({ carrusel: ['Indica tu contraseña para cambiar el estado del carrusel'] })
            return
        }
        setSavingCarrusel(true)
        setErrors({})
        try {
            await axios.patch('/admin/publicidad/carrusel', {
                activo: carruselLocal,
                admin_password: passwordCarrusel,
            })
            setPasswordCarrusel('')
            await mutatePub()
            setSuccess('Estado del carrusel actualizado')
            setTimeout(() => setSuccess(''), 4000)
        } catch (err) {
            const errData = err.response?.data
            setErrors(errData?.errors || { carrusel: [errData?.message || 'Error al actualizar'] })
        } finally {
            setSavingCarrusel(false)
        }
    }

    const crearPromocion = async () => {
        if (!promoNuevaTitulo.trim()) {
            setErrors({ promo: ['El título es obligatorio'] })
            return
        }
        if (promoSeleccionadaId) {
            setErrors({ promo: ['Deselecciona la promoción de la tabla inferior para crear una nueva con el borrador.'] })
            return
        }
        if (!passwordPromoCrear.trim()) {
            setErrors({ promo: ['La contraseña es obligatoria para crear la promoción en el servidor.'] })
            return
        }
        setCreandoPromo(true)
        setErrors({})
        try {
            await axios.post('/admin/promociones', {
                titulo: promoNuevaTitulo.trim(),
                descripcion: promoNuevaDesc.trim() || null,
                slug: promoNuevaSlug.trim() || undefined,
                claves: draftLineas.map((r) => r.clave),
                admin_password: passwordPromoCrear,
            })
            setPromoNuevaTitulo('')
            setPromoNuevaDesc('')
            setPromoNuevaSlug('')
            setPasswordPromoCrear('')
            setDraftLineas([])
            await mutatePromos()
            setSuccess('Promoción creada. Ya puedes abrirla en la URL indicada.')
            setTimeout(() => setSuccess(''), 5000)
        } catch (err) {
            const errData = err.response?.data
            setErrors(errData?.errors || { promo: [errData?.message || 'Error al crear'] })
        } finally {
            setCreandoPromo(false)
        }
    }

    const quitarDelBorrador = (clave) => {
        setDraftLineas((prev) => prev.filter((r) => r.clave !== clave))
    }

    const agregarProductoDesdeBusqueda = async (pr) => {
        if (promoSeleccionadaId) {
            if (!passwordPromoAcciones.trim()) {
                setErrors({ promo: ['Indica la contraseña para agregar productos a la promoción seleccionada.'] })
                return
            }
            setErrors({})
            try {
                await axios.post(`/admin/promociones/${promoSeleccionadaId}/items`, {
                    clave: pr.clave,
                    admin_password: passwordPromoAcciones,
                })
                await mutatePromoDetalle()
                setSuccess('Producto agregado a la promoción existente')
                setTimeout(() => setSuccess(''), 3000)
            } catch (err) {
                const errData = err.response?.data
                setErrors(errData?.errors || { promo: [errData?.message || 'Error al agregar'] })
            }
        } else {
            setErrors({})
            setDraftLineas((prev) => {
                if (prev.some((r) => r.clave === pr.clave)) return prev
                return [
                    ...prev,
                    {
                        clave: pr.clave,
                        descripcion: pr.descripcion || '',
                        marca: pr.marca || '',
                    },
                ]
            })
        }
    }

    const quitarDePromocion = (clave) => {
        if (!promoSeleccionadaId) return
        setModal({
            open: true,
            title: 'Quitar producto de la promoción',
            loading: false,
            error: '',
            onConfirm: async (pw) => {
                setModal((m) => ({ ...m, loading: true, error: '' }))
                try {
                    await axios.post(`/admin/promociones/${promoSeleccionadaId}/quitar-item`, {
                        clave,
                        admin_password: pw,
                    })
                    await mutatePromoDetalle()
                    setModal({ open: false, title: '', loading: false, error: '', onConfirm: null })
                } catch (err) {
                    const msg = err.response?.data?.errors?.admin_password?.[0] || err.response?.data?.message || 'Error'
                    setModal((m) => ({ ...m, loading: false, error: msg }))
                }
            },
        })
    }

    const eliminarPromocion = (id) => {
        setModal({
            open: true,
            title: 'Eliminar promoción',
            loading: false,
            error: '',
            onConfirm: async (pw) => {
                setModal((m) => ({ ...m, loading: true, error: '' }))
                try {
                    await axios.delete(`/admin/promociones/${id}`, { data: { admin_password: pw } })
                    if (promoSeleccionadaId === id) setPromoSeleccionadaId(null)
                    await mutatePromos()
                    setModal({ open: false, title: '', loading: false, error: '', onConfirm: null })
                } catch (err) {
                    const msg = err.response?.data?.message || 'Error al eliminar'
                    setModal((m) => ({ ...m, loading: false, error: msg }))
                }
            },
        })
    }

    const labelClass = darkMode ? 'text-gray-300 block mb-1.5 text-sm font-medium' : 'text-gray-700 block mb-1.5 text-sm font-medium'
    const inputClass = darkMode
        ? 'w-full px-4 py-2.5 rounded-lg border border-gray-600 bg-gray-700/80 text-white focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500'
        : 'w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500'
    const card = `rounded-xl overflow-hidden border shadow-xl ${darkMode ? 'bg-tienda-elevated border-gray-700' : 'bg-white border-gray-200'}`

    return (
        <div className="space-y-8">
            <PasswordModal
                open={modal.open}
                title={modal.title}
                darkMode={darkMode}
                loading={modal.loading}
                error={modal.error}
                onClose={() => setModal({ open: false, title: '', loading: false, error: '', onConfirm: null })}
                onConfirm={(pw) => modal.onConfirm?.(pw)}
            />

            <div className="flex items-center gap-4">
                <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${darkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                </span>
                <div>
                    <h1 className={`text-2xl font-bold tracking-tight ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Publicidad y promociones</h1>
                    <p className={`text-sm mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Carrusel de la tienda, promociones con URL propia y banners con enlace opcional.
                    </p>
                </div>
            </div>

            {success && (
                <div className={`flex items-center gap-2 rounded-lg px-4 py-3 ${darkMode ? 'bg-emerald-500/20 border border-emerald-500/40' : 'bg-emerald-50 border border-emerald-200'}`}>
                    <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{success}</p>
                </div>
            )}

            {/* 1. Estado carrusel global */}
            <div className={card}>
                <div className={`px-5 py-4 ${darkMode ? 'bg-sky-600/25 border-b border-sky-500/30' : 'bg-sky-50 border-b border-sky-200'}`}>
                    <h2 className={`text-lg font-bold ${darkMode ? 'text-sky-200' : 'text-sky-900'}`}>Visibilidad del carrusel en la tienda</h2>
                </div>
                <div className="p-6 space-y-4">
                    <div className={`flex items-center gap-3 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                        <SwitchToggle
                            id="carrusel-visible-toggle"
                            checked={carruselLocal}
                            onChange={setCarruselLocal}
                            disabled={savingCarrusel}
                            darkMode={darkMode}
                            aria-label="Carrusel de publicidad visible en la tienda"
                        />
                        <label htmlFor="carrusel-visible-toggle" className="cursor-pointer select-none text-sm font-medium">
                            Carrusel de publicidad visible en la tienda
                        </label>
                    </div>
                    <div className="max-w-md">
                        <Label className={labelClass}>Contraseña del administrador</Label>
                        <input
                            type="password"
                            autoComplete="current-password"
                            value={passwordCarrusel}
                            onChange={(e) => setPasswordCarrusel(e.target.value)}
                            className={inputClass}
                            placeholder="Requerida para guardar"
                        />
                    </div>
                    <InputError messages={errors.carrusel} />
                    <Button
                        type="button"
                        onClick={guardarCarrusel}
                        disabled={savingCarrusel}
                        className={`py-2.5 px-5 rounded-lg font-semibold ${darkMode ? '!bg-sky-600' : '!bg-sky-700'} text-white`}
                    >
                        {savingCarrusel ? 'Guardando…' : 'Guardar estado del carrusel'}
                    </Button>
                </div>
            </div>

            {/* 2. Promociones */}
            <div className={card}>
                <div className={`px-5 py-4 ${darkMode ? 'bg-violet-600/25 border-b border-violet-500/30' : 'bg-violet-50 border-b border-violet-200'}`}>
                    <h2 className={`text-lg font-bold ${darkMode ? 'text-violet-200' : 'text-violet-900'}`}>Promociones</h2>
                </div>
                <div className="p-6 space-y-8">
                    {/* Datos de la nueva promoción (borrador; sin llamar a la API) */}
                    <div className={`grid gap-4 md:grid-cols-2 ${darkMode ? '' : ''}`}>
                        <div className="md:col-span-2">
                            <h3 className={`font-semibold mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Nueva promoción (borrador)</h3>
                            {promoSeleccionadaId && (
                                <p className={`text-sm mb-2 ${darkMode ? 'text-amber-300/95' : 'text-amber-800'}`}>
                                    Hay una promoción existente seleccionada para edición. Deselecciónala (mismo botón «Editar») para seguir armando una nueva aquí.
                                </p>
                            )}
                        </div>
                        <div>
                            <Label className={labelClass}>Título</Label>
                            <Input
                                value={promoNuevaTitulo}
                                onChange={(e) => setPromoNuevaTitulo(e.target.value)}
                                className={inputClass}
                                disabled={!!promoSeleccionadaId}
                                required
                            />
                        </div>
                        <div>
                            <Label className={labelClass}>Slug (opcional)</Label>
                            <Input
                                value={promoNuevaSlug}
                                onChange={(e) => setPromoNuevaSlug(e.target.value)}
                                className={inputClass}
                                placeholder="ej: oferta-enero (se normaliza a minúsculas y guiones)"
                                disabled={!!promoSeleccionadaId}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <Label className={labelClass}>Descripción (opcional)</Label>
                            <textarea
                                value={promoNuevaDesc}
                                onChange={(e) => setPromoNuevaDesc(e.target.value)}
                                rows={2}
                                className={inputClass}
                                disabled={!!promoSeleccionadaId}
                            />
                        </div>
                    </div>

                    {/* Buscador de catálogo */}
                    <div>
                        <h3 className={`font-semibold mb-3 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Buscar productos del catálogo</h3>
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            <div>
                                <Label className={labelClass}>Búsqueda (opcional)</Label>
                                <Input value={busquedaQ} onChange={(e) => setBusquedaQ(e.target.value)} className={inputClass} placeholder="Texto o clave…" />
                            </div>
                            <div>
                                <Label className={labelClass}>Categoría principal</Label>
                                <select
                                    value={catPrincipal}
                                    onChange={(e) => {
                                        setCatPrincipal(e.target.value)
                                        setSubcategoria('')
                                    }}
                                    className={inputClass}
                                >
                                    <option value="">— Todas —</option>
                                    {categorias.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <Label className={labelClass}>Subcategoría (grupo)</Label>
                                <select
                                    value={subcategoria}
                                    onChange={(e) => setSubcategoria(e.target.value)}
                                    className={inputClass}
                                    disabled={!catPrincipal}
                                >
                                    <option value="">—</option>
                                    {catPrincipal && <option value="ver-todo">Ver toda la categoría</option>}
                                    {subOpciones.map((s) => (
                                        <option key={s} value={s}>
                                            {s}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <Label className={labelClass}>Marca</Label>
                                <select value={marca} onChange={(e) => setMarca(e.target.value)} className={inputClass}>
                                    <option value="">— Todas —</option>
                                    {marcasOpts.map((m) => (
                                        <option key={m} value={m}>
                                            {m}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className={`flex items-center gap-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                <SwitchToggle
                                    id="solo-stock-promo-filtro"
                                    checked={soloStock}
                                    onChange={setSoloStock}
                                    darkMode={darkMode}
                                    aria-label={soloStock ? 'Filtrar solo con stock' : 'Incluir también sin stock'}
                                />
                                <label htmlFor="solo-stock-promo-filtro" className="cursor-pointer select-none text-sm">
                                    Solo con stock
                                </label>
                            </div>
                        </div>
                        {Object.keys(filtrosDinamicos).length > 0 && (
                            <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                                {Object.entries(filtrosDinamicos).map(([etiqueta, valores]) => (
                                    <div key={etiqueta}>
                                        <Label className={labelClass}>{etiqueta}</Label>
                                        <select
                                            value={filtrosVals[etiqueta] || ''}
                                            onChange={(e) =>
                                                setFiltrosVals((prev) => ({
                                                    ...prev,
                                                    [etiqueta]: e.target.value || undefined,
                                                }))
                                            }
                                            className={inputClass}
                                        >
                                            <option value="">— Cualquiera —</option>
                                            {(valores || []).map((v) => (
                                                <option key={v} value={v}>
                                                    {v}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        )}
                        {promoSeleccionadaId ? (
                            <div className="mt-4 max-w-md">
                                <Label className={labelClass}>Contraseña (solo para agregar a la promoción seleccionada)</Label>
                                <input
                                    type="password"
                                    value={passwordPromoAcciones}
                                    onChange={(e) => setPasswordPromoAcciones(e.target.value)}
                                    className={inputClass}
                                    autoComplete="new-password"
                                />
                            </div>
                        ) : null}
                        {totalBusqueda > 0 ? (
                            <p className={`mt-3 text-sm font-medium ${darkMode ? 'text-violet-300/90' : 'text-violet-800'}`}>
                                {totalBusqueda} resultado{totalBusqueda !== 1 ? 's' : ''}
                            </p>
                        ) : null}
                        {loadingBusqueda ? (
                            <p className="mt-4 text-sm">Cargando…</p>
                        ) : (
                            <div className="mt-4 overflow-x-auto rounded-lg border border-gray-600/30">
                                <table className="min-w-full text-sm">
                                    <thead className={darkMode ? 'bg-gray-800/80' : 'bg-gray-100'}>
                                        <tr>
                                            <th className="text-left p-2">Clave</th>
                                            <th className="text-left p-2">Descripción</th>
                                            <th className="text-left p-2">Marca</th>
                                            <th className="p-2" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {productosBusqueda.map((pr) => (
                                            <tr key={pr.clave} className={darkMode ? 'border-t border-gray-700' : 'border-t border-gray-200'}>
                                                <td className="p-2 font-mono text-xs">{pr.clave}</td>
                                                <td className="p-2 max-w-xs truncate" title={pr.descripcion}>
                                                    {pr.descripcion}
                                                </td>
                                                <td className="p-2">{pr.marca}</td>
                                                <td className="p-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => agregarProductoDesdeBusqueda(pr)}
                                                        className="text-xs px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-500"
                                                    >
                                                        {promoSeleccionadaId ? 'Agregar a promoción' : 'Agregar a la lista'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {totalBusqueda > 12 && (
                            <div className="mt-2 flex gap-2">
                                <button
                                    type="button"
                                    disabled={pageBusqueda <= 1}
                                    onClick={() => ejecutarBusquedaProductos(pageBusqueda - 1)}
                                    className="text-sm underline disabled:opacity-40"
                                >
                                    Anterior
                                </button>
                                <button
                                    type="button"
                                    disabled={pageBusqueda * 12 >= totalBusqueda}
                                    onClick={() => ejecutarBusquedaProductos(pageBusqueda + 1)}
                                    className="text-sm underline disabled:opacity-40"
                                >
                                    Siguiente
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Lista local antes de crear (solo si ya hay productos) */}
                    {!promoSeleccionadaId && draftLineas.length > 0 && (
                        <div>
                            <div className="overflow-x-auto rounded-lg border border-gray-600/30">
                                <table className="min-w-full text-sm">
                                    <thead className={darkMode ? 'bg-gray-800/80' : 'bg-gray-100'}>
                                        <tr>
                                            <th className="text-left p-2 w-10">#</th>
                                            <th className="text-left p-2">Clave</th>
                                            <th className="text-left p-2">Descripción</th>
                                            <th className="text-left p-2">Marca</th>
                                            <th className="p-2" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {draftLineas.map((row, idx) => (
                                            <tr key={row.clave} className={darkMode ? 'border-t border-gray-700' : 'border-t border-gray-200'}>
                                                <td className="p-2 text-gray-500">{idx + 1}</td>
                                                <td className="p-2 font-mono text-xs">{row.clave}</td>
                                                <td className="p-2 max-w-md truncate" title={row.descripcion}>
                                                    {row.descripcion}
                                                </td>
                                                <td className="p-2">{row.marca}</td>
                                                <td className="p-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => quitarDelBorrador(row.clave)}
                                                        className="text-xs px-2 py-1 rounded bg-red-600/85 text-white"
                                                    >
                                                        Quitar
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {!promoSeleccionadaId && (
                        <div className="space-y-4 max-w-md border-t border-gray-600/30 dark:border-gray-600 pt-6">
                            <div>
                                <Label className={labelClass}>Contraseña del administrador</Label>
                                <input
                                    type="password"
                                    value={passwordPromoCrear}
                                    onChange={(e) => setPasswordPromoCrear(e.target.value)}
                                    className={inputClass}
                                    autoComplete="new-password"
                                />
                            </div>
                            <InputError messages={errors.promo} />
                            <Button
                                type="button"
                                onClick={crearPromocion}
                                disabled={creandoPromo}
                                className="!bg-violet-600 hover:!bg-violet-500 text-white py-2.5 px-5 rounded-lg font-semibold"
                            >
                                {creandoPromo ? 'Creando…' : 'Crear promoción'}
                            </Button>
                        </div>
                    )}

                    <div>
                        <h3 className={`font-semibold mb-3 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Promociones existentes</h3>
                        <div className="overflow-x-auto rounded-lg border border-gray-600/40 dark:border-gray-600">
                            <table className="min-w-full text-sm">
                                <thead className={darkMode ? 'bg-gray-800/80' : 'bg-gray-100'}>
                                    <tr>
                                        <th className="text-left p-2">Título</th>
                                        <th className="text-left p-2">URL</th>
                                        <th className="text-left p-2">Productos</th>
                                        <th className="p-2">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {promocionesList.map((p) => (
                                        <tr key={p.id} className={darkMode ? 'border-t border-gray-700' : 'border-t border-gray-200'}>
                                            <td className="p-2 font-medium">{p.titulo}</td>
                                            <td className="p-2">
                                                <code className="text-xs break-all">{p.url_tienda}</code>
                                            </td>
                                            <td className="p-2">{p.items_count}</td>
                                            <td className="p-2 flex flex-wrap gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setPromoSeleccionadaId(promoSeleccionadaId === p.id ? null : p.id)}
                                                    className={`text-xs px-2 py-1 rounded ${promoSeleccionadaId === p.id ? 'bg-emerald-600 text-white' : darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}
                                                >
                                                    {promoSeleccionadaId === p.id ? 'Deseleccionar' : 'Editar productos'}
                                                </button>
                                                <button type="button" onClick={() => eliminarPromocion(p.id)} className="text-xs px-2 py-1 rounded bg-red-600/90 text-white">
                                                    Eliminar
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {promocionesList.length === 0 && (
                                <p className={`p-4 text-sm ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>Aún no hay promociones.</p>
                            )}
                        </div>
                    </div>

                    {promoSeleccionadaId && promoDetalle && (
                        <div className={`rounded-lg p-4 ${darkMode ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
                            <h4 className="font-semibold mb-2">Productos en «{promoDetalle.titulo}»</h4>
                            <p className="text-xs mb-3 opacity-80 break-all">{promoDetalle.url_tienda}</p>
                            <ul className="flex flex-wrap gap-2">
                                {(promoDetalle.claves || []).map((c) => (
                                    <li key={c} className="flex items-center gap-1 rounded-full bg-black/10 px-2 py-1 text-xs">
                                        <span className="max-w-[12rem] truncate">{c}</span>
                                        <button type="button" className="text-red-500 font-bold" onClick={() => quitarDePromocion(c)} title="Quitar">
                                            ×
                                        </button>
                                    </li>
                                ))}
                            </ul>
                            {(promoDetalle.claves || []).length === 0 && (
                                <p className="text-sm opacity-70">Sin productos. Usa el buscador de arriba con contraseña para agregar.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* 3. Cargar banner */}
            <div className={card}>
                <div className={`px-5 py-4 ${darkMode ? 'bg-emerald-600/25 border-b border-emerald-500/30' : 'bg-emerald-50 border-b border-emerald-200'}`}>
                    <div className="flex items-center gap-3">
                        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${darkMode ? 'bg-emerald-500/30 text-emerald-300' : 'bg-emerald-100 text-emerald-600'}`}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                        </span>
                        <h2 className={`text-lg font-bold ${darkMode ? 'text-emerald-200' : 'text-emerald-800'}`}>Cargar imagen al carrusel</h2>
                    </div>
                </div>
                <div className="p-6">
                    <form onSubmit={handleGuardar} className="space-y-5">
                        <div>
                            <Label className={labelClass}>Imagen (JPG, PNG, GIF, WebP, máx. 9 MB)</Label>
                            <input
                                type="file"
                                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                                onChange={handleFileChange}
                                className={`block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium ${
                                    darkMode
                                        ? 'file:bg-emerald-600 file:text-white file:hover:bg-emerald-500 text-gray-300'
                                        : 'file:bg-emerald-600 file:text-white file:hover:bg-emerald-700 text-gray-700'
                                }`}
                            />
                            {previewUrl && (
                                <div className="mt-3 relative w-48 h-24 rounded-lg overflow-hidden border border-gray-600">
                                    <img src={previewUrl} alt="Vista previa" className="object-cover w-full h-full" />
                                </div>
                            )}
                            <InputError messages={errors.imagen} />
                        </div>
                        <div>
                            <Label className={labelClass}>Título (opcional)</Label>
                            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} className={`${inputClass} ${titulo?.trim() ? '!bg-[#E5EBFD] !text-gray-900' : ''}`} placeholder="Ej: Oferta de temporada" />
                        </div>
                        <div>
                            <Label className={labelClass}>Enlace al hacer clic (opcional)</Label>
                            <Input
                                value={enlaceBanner}
                                onChange={(e) => setEnlaceBanner(e.target.value)}
                                className={inputClass}
                                placeholder="Ej: /tienda/promocion/mi-slug o https://…"
                            />
                            {promocionesList.length > 0 && (
                                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                                    Atajo:{' '}
                                    {promocionesList.slice(0, 6).map((p) => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            className="underline mr-2 text-emerald-500"
                                            onClick={() => setEnlaceBanner(p.url_tienda)}
                                        >
                                            {p.titulo}
                                        </button>
                                    ))}
                                </p>
                            )}
                        </div>
                        <div className="max-w-md">
                            <Label className={labelClass}>Contraseña del administrador</Label>
                            <input
                                type="password"
                                value={passwordBanner}
                                onChange={(e) => setPasswordBanner(e.target.value)}
                                className={inputClass}
                                autoComplete="new-password"
                            />
                            <InputError messages={errors.admin_password} />
                        </div>
                        <InputError messages={errors.general} />
                        <Button
                            type="submit"
                            disabled={uploading || !selectedFile}
                            className={`w-full sm:w-auto py-3 px-6 rounded-lg font-semibold flex items-center justify-center gap-2 ${
                                darkMode ? '!bg-emerald-500 hover:!bg-emerald-400' : '!bg-emerald-600 hover:!bg-emerald-700'
                            } text-white transition-all duration-200`}
                        >
                            {uploading ? 'Guardando…' : 'Guardar'}
                        </Button>
                    </form>
                </div>
            </div>

            <div className={card}>
                <div className={`px-5 py-4 ${darkMode ? 'bg-gray-700/50 border-b border-gray-600' : 'bg-gray-50 border-b border-gray-200'}`}>
                    <div className="flex items-center justify-between">
                        <h2 className={`text-lg font-bold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Imágenes actuales</h2>
                        <span className={`text-sm font-medium px-3 py-1 rounded-full ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                            {imagenes.length} imagen{imagenes.length !== 1 ? 'es' : ''}
                        </span>
                    </div>
                </div>
                <div className="p-6">
                    {imagenes.length === 0 ? (
                        <div className={`flex flex-col items-center justify-center py-16 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                            <p className="font-medium">No hay imágenes de publicidad</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {imagenes.map((img) => (
                                <div
                                    key={img.id}
                                    className={`rounded-lg overflow-hidden border ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}
                                >
                                    <div className="relative aspect-video bg-tienda-canvas">
                                        <img
                                            src={resolvePublicidadUrl(img.url)}
                                            alt={img.titulo || `Publicidad ${img.orden}`}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="p-3 space-y-1">
                                        <span className={`text-sm block ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{img.titulo || `#${img.orden}`}</span>
                                        {img.enlace && (
                                            <span className="text-xs break-all text-emerald-500 block">Enlace: {img.enlace}</span>
                                        )}
                                        <div className="flex justify-end pt-1">
                                            <button
                                                type="button"
                                                onClick={() => abrirModalEliminar(img.id)}
                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                    darkMode ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/40' : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                                                }`}
                                            >
                                                Eliminar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
