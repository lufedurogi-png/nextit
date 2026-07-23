'use client'

import { useAdminTheme } from '@/contexts/AdminThemeContext'

import { useState, useEffect, useCallback, useMemo } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import axios from '@/lib/axios'
import { resolvePublicidadUrl } from '@/lib/publicidad'
import Button from '@/components/Button'
import FancySelect from '@/components/FancySelect'
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
    getPorClaves,
    getProductos,
    resolveStorageUrl,
} from '@/lib/productos'

const PUBLICIDAD_KEY = '/admin/publicidad'
const PROMOCIONES_KEY = '/admin/promociones'
const swrConfig = { revalidateOnFocus: false, dedupingInterval: 5000 }

/** URLs de imágenes del producto (principal + galería), sin duplicados. */
function getProductoImagenesUrls(pr) {
    if (!pr || typeof pr !== 'object') return []
    const seen = new Set()
    const out = []
    const push = (raw) => {
        if (raw == null || raw === '') return
        const u = typeof raw === 'string' ? resolveStorageUrl(raw) : ''
        if (u && !seen.has(u)) {
            seen.add(u)
            out.push(u)
        }
    }
    if (pr.imagen) push(pr.imagen)
    if (Array.isArray(pr.imagenes)) pr.imagenes.forEach(push)
    if (Array.isArray(pr.imagenes_urls)) pr.imagenes_urls.forEach(push)
    return out
}

function urlsFromDraftRow(row) {
    if (Array.isArray(row?.imagenes_urls) && row.imagenes_urls.length) return row.imagenes_urls
    if (row?.imagen_url) return [row.imagen_url]
    return []
}

/** Mini vista de galería: una imagen y pestañas 1…n si hay varias. */
function ProductoImagenesCelda({ urls, darkMode, rowKey }) {
    const list = (Array.isArray(urls) ? urls : []).filter(Boolean)
    const listKey = list.join('|')
    const [idx, setIdx] = useState(0)
    useEffect(() => {
        setIdx(0)
    }, [rowKey, listKey])
    const safe = list.length ? Math.min(idx, list.length - 1) : 0
    if (list.length === 0) {
        return (
            <span className={`inline-flex min-h-[4.5rem] min-w-[4.5rem] items-center justify-center rounded-lg border text-[10px] font-medium uppercase leading-tight px-1 text-center ${
                darkMode ? 'border-gray-600 bg-gray-800/80 text-gray-500' : 'border-gray-200 bg-gray-50 text-gray-400'
            }`}>
                Sin imagen
            </span>
        )
    }
    const cur = list[safe]
    return (
        <div className="flex w-[5.75rem] shrink-0 flex-col items-stretch gap-1">
            <div
                className={`aspect-square overflow-hidden rounded-lg border ${
                    darkMode ? 'border-gray-600 bg-gray-900' : 'border-gray-200 bg-gray-100'
                }`}
            >
                <img src={cur} alt="" className="h-full w-full object-cover" loading="lazy" />
            </div>
            {list.length > 1 ? (
                <div className="flex flex-wrap justify-center gap-0.5" role="tablist" aria-label="Imágenes del producto">
                    {list.map((_, i) => (
                        <button
                            key={i}
                            type="button"
                            role="tab"
                            aria-selected={i === safe}
                            onClick={() => setIdx(i)}
                            className={`min-w-[1.25rem] rounded px-1 py-0.5 text-[10px] font-bold leading-none transition-colors ${
                                i === safe
                                    ? darkMode
                                        ? 'bg-orange-600 text-white ring-1 ring-orange-400/60'
                                        : 'bg-orange-600 text-white shadow-sm'
                                    : darkMode
                                      ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            }`}
                        >
                            {i + 1}
                        </button>
                    ))}
                </div>
            ) : null}
        </div>
    )
}

function AdminPasswordField({ id, label, value, onChange, darkMode, labelClass, placeholder, autoComplete, className = 'max-w-md' }) {
    const [show, setShow] = useState(false)
    const wrap = darkMode
        ? 'border-gray-600/90 bg-gray-900/40 focus-within:border-orange-500/55 focus-within:ring-orange-500/25'
        : 'border-gray-300 bg-white focus-within:border-orange-400 focus-within:ring-orange-200'
    return (
        <div className={className}>
            {label ? <Label className={labelClass}>{label}</Label> : null}
            <div className={`mt-0 flex rounded-lg border shadow-sm overflow-hidden ring-0 focus-within:ring-2 ${wrap}`}>
                <input
                    id={id}
                    type={show ? 'text' : 'password'}
                    autoComplete={autoComplete}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className={`flex-1 min-w-0 border-0 bg-transparent px-3 py-2.5 text-sm outline-none ${
                        darkMode ? 'text-gray-100 placeholder:text-gray-500' : 'text-gray-900 placeholder:text-gray-400'
                    }`}
                />
                <button
                    type="button"
                    className={`shrink-0 px-3 text-xs font-semibold tracking-wide border-l transition-colors ${
                        darkMode
                            ? 'border-gray-600 text-gray-300 hover:bg-gray-800'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                    onClick={() => setShow((s) => !s)}
                    aria-pressed={show}
                    aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                    {show ? 'Ocultar' : 'Ver'}
                </button>
            </div>
        </div>
    )
}

function PasswordModal({ open, title, darkMode, loading, error, onClose, onConfirm }) {
    const [pw, setPw] = useState('')
    const [showPw, setShowPw] = useState(false)
    useEffect(() => {
        if (open) {
            setPw('')
            setShowPw(false)
        }
    }, [open])
    if (!open) return null
    const box = darkMode ? 'bg-tienda-elevated border-gray-600 text-gray-100' : 'bg-white border-gray-200 text-gray-900'
    const wrap = darkMode
        ? 'border-gray-600/90 bg-gray-800/80 focus-within:border-orange-500/50'
        : 'border-gray-300 bg-white focus-within:border-orange-400'
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
                    Introduce la contraseña del usuario en sesión para continuar.
                </p>
                <div className={`flex rounded-lg border overflow-hidden mb-3 focus-within:ring-2 ${wrap} ${darkMode ? 'ring-orange-500/20' : 'ring-orange-200'}`}>
                    <input
                        type={showPw ? 'text' : 'password'}
                        autoComplete="current-password"
                        value={pw}
                        onChange={(e) => setPw(e.target.value)}
                        className={`flex-1 min-w-0 border-0 bg-transparent px-3 py-2.5 text-sm outline-none ${
                            darkMode ? 'text-white placeholder:text-gray-500' : 'text-gray-900'
                        }`}
                        placeholder="Contraseña"
                    />
                    <button
                        type="button"
                        className={`shrink-0 px-3 text-xs font-semibold border-l ${
                            darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700/80' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                        onClick={() => setShowPw((s) => !s)}
                        aria-pressed={showPw}
                        aria-label={showPw ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                        {showPw ? 'Ocultar' : 'Ver'}
                    </button>
                </div>
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
                        className="px-4 py-2 rounded-lg text-sm font-semibold bg-orange-600 text-white disabled:opacity-50"
                    >
                        {loading ? '…' : 'Confirmar'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default function AdminPublicidad() {
    const { darkMode } = useAdminTheme()
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

    /** Enlace del banner solo puede ser URL de promoción existente; si no hay lista o desaparece la elegida, se limpia. */
    useEffect(() => {
        if (!Array.isArray(promocionesList) || promocionesList.length === 0) {
            setEnlaceBanner('')
            return
        }
        setEnlaceBanner((prev) => {
            const p = String(prev || '').trim()
            if (!p) return ''
            return promocionesList.some((x) => x.url_tienda === p) ? p : ''
        })
    }, [promocionesList])

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

    const clavesPromoOrden = Array.isArray(promoDetalle?.claves) ? promoDetalle.claves : []
    const promoItemsProductosKey =
        promoSeleccionadaId && clavesPromoOrden.length > 0
            ? ['promo-items-prods', promoSeleccionadaId, JSON.stringify(clavesPromoOrden)]
            : null

    const { data: promoItemsProductos = [], isLoading: loadingPromoItemsProductos } = useSWR(
        promoItemsProductosKey,
        () => getPorClaves([...clavesPromoOrden]),
        swrConfig
    )

    const productoPromoPorClave = useMemo(() => {
        const m = {}
        for (const p of promoItemsProductos || []) {
            if (p?.clave) m[p.clave] = p
        }
        return m
    }, [promoItemsProductos])

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

    const filtrosDinamicosEntries = useMemo(() => Object.entries(filtrosDinamicos), [filtrosDinamicos])
    const filtrosCarriles = useMemo(() => {
        if (filtrosDinamicosEntries.length === 0) return []
        if (filtrosDinamicosEntries.length <= 8) return [filtrosDinamicosEntries]
        const r1 = []
        const r2 = []
        filtrosDinamicosEntries.forEach((item, idx) => {
            if (idx % 2 === 0) r1.push(item)
            else r2.push(item)
        })
        return [r1, r2]
    }, [filtrosDinamicosEntries])

    const categoriaOptions = useMemo(
        () => [{ value: '', label: 'Todas' }, ...categorias.map((c) => ({ value: c.id, label: c.nombre }))],
        [categorias],
    )
    const subcategoriaOptions = useMemo(() => {
        const base = [{ value: '', label: 'Todas' }]
        if (catPrincipal) base.push({ value: 'ver-todo', label: 'Ver toda la categoría' })
        return [...base, ...subOpciones.map((s) => ({ value: s, label: s }))]
    }, [catPrincipal, subOpciones])
    const marcaOptions = useMemo(
        () => [{ value: '', label: 'Todas' }, ...marcasOpts.map((m) => ({ value: m, label: m }))],
        [marcasOpts],
    )

    const limpiarFiltrosCatalogo = () => {
        setBusquedaQ('')
        setCatPrincipal('')
        setSubcategoria('')
        setMarca('')
        setSoloStock(false)
        setFiltrosVals({})
        setFiltrosDinamicos({})
        setProductosBusqueda([])
        setTotalBusqueda(0)
        setPageBusqueda(1)
    }

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
                        imagenes_urls: getProductoImagenesUrls(pr),
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
        ? 'w-full px-4 py-2.5 rounded-lg border border-gray-600 bg-gray-700/80 text-white focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500'
        : 'w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500'
    const catalogFilterInputClass = darkMode
        ? 'w-full rounded-xl border border-orange-800/50 bg-[#202020]/80 px-3 py-2 text-sm text-gray-100 placeholder:text-orange-400/60'
        : 'w-full rounded-xl border border-orange-100 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400'
    const catalogFilterLabelClass = darkMode
        ? 'block text-xs mb-1 text-orange-200/70'
        : 'block text-xs mb-1 text-orange-800/80'
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
                <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${darkMode ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600'}`}>
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
                <div className={`flex items-center gap-2 rounded-lg px-4 py-3 ${darkMode ? 'bg-orange-500/20 border border-orange-500/40' : 'bg-orange-50 border border-orange-200'}`}>
                    <p className="text-sm font-medium text-orange-600 dark:text-orange-400">{success}</p>
                </div>
            )}

            {/* 1. Estado carrusel global */}
            <div className={card}>
                <div className={`px-5 py-4 ${darkMode ? 'bg-orange-600/25 border-b border-orange-500/30' : 'bg-orange-50 border-b border-orange-200'}`}>
                    <h2 className={`text-lg font-bold ${darkMode ? 'text-orange-200' : 'text-orange-900'}`}>Visibilidad del carrusel en la tienda</h2>
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
                    <AdminPasswordField
                        id="admin-password-carrusel"
                        label="Tu contraseña"
                        value={passwordCarrusel}
                        onChange={(e) => setPasswordCarrusel(e.target.value)}
                        darkMode={darkMode}
                        labelClass={labelClass}
                        placeholder="Requerida para guardar"
                        autoComplete="current-password"
                    />
                    <InputError messages={errors.carrusel} />
                    <Button
                        type="button"
                        onClick={guardarCarrusel}
                        disabled={savingCarrusel}
                        className={`py-2.5 px-5 rounded-lg font-semibold ${darkMode ? '!bg-orange-600' : '!bg-orange-700'} text-white`}
                    >
                        {savingCarrusel ? 'Guardando…' : 'Guardar estado del carrusel'}
                    </Button>
                </div>
            </div>

            {/* 2. Promociones */}
            <div className={card}>
                <div className={`px-5 py-4 ${darkMode ? 'bg-orange-600/25 border-b border-orange-500/30' : 'bg-orange-50 border-b border-orange-200'}`}>
                    <h2 className={`text-lg font-bold ${darkMode ? 'text-orange-200' : 'text-orange-900'}`}>Promociones</h2>
                </div>
                <div className="p-6 space-y-8">
                    {/* Datos de la nueva promoción (borrador; sin llamar a la API) */}
                    <div className={`grid gap-4 md:grid-cols-2 ${darkMode ? '' : ''}`}>
                        <div className="md:col-span-2">
                            <h3 className={`font-semibold mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Nueva promoción (borrador)</h3>
                            {promoSeleccionadaId && (
                                <p className={`text-sm mb-2 ${darkMode ? 'text-orange-300/95' : 'text-orange-800'}`}>
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
                        <div
                            className={`rounded-2xl border p-4 md:p-5 ${
                                darkMode ? 'border-orange-900/40 bg-[#262626]/90' : 'border-orange-100 bg-white'
                            }`}
                        >
                            <div className="flex flex-wrap items-end gap-2 md:gap-3">
                                <div className="min-w-[220px] flex-1">
                                    <label className={catalogFilterLabelClass}>Buscar</label>
                                    <input
                                        value={busquedaQ}
                                        onChange={(e) => setBusquedaQ(e.target.value)}
                                        placeholder="Nombre, clave o palabra…"
                                        className={catalogFilterInputClass}
                                    />
                                </div>
                                <div className="min-w-[170px]">
                                    <label className={catalogFilterLabelClass}>Categoría</label>
                                    <FancySelect
                                        accent="orange"
                                        value={catPrincipal}
                                        onChange={(v) => {
                                            setCatPrincipal(v)
                                            setSubcategoria('')
                                        }}
                                        options={categoriaOptions}
                                        darkMode={darkMode}
                                    />
                                </div>
                                <div className="min-w-[170px]">
                                    <label className={catalogFilterLabelClass}>Subcategoría</label>
                                    <FancySelect
                                        accent="orange"
                                        value={subcategoria}
                                        onChange={setSubcategoria}
                                        options={subcategoriaOptions}
                                        darkMode={darkMode}
                                        disabled={!catPrincipal}
                                    />
                                </div>
                                <div className="min-w-[170px]">
                                    <label className={catalogFilterLabelClass}>Marca</label>
                                    <FancySelect
                                        accent="orange"
                                        value={marca}
                                        onChange={setMarca}
                                        options={marcaOptions}
                                        darkMode={darkMode}
                                    />
                                </div>
                                <label className="inline-flex items-center gap-2 px-2 pb-2">
                                    <SwitchToggle
                                        id="solo-stock-promo-filtro"
                                        checked={soloStock}
                                        onChange={setSoloStock}
                                        darkMode={darkMode}
                                        aria-label={soloStock ? 'Con stock' : 'Sin stock'}
                                    />
                                    <span
                                        className={`text-sm select-none ${
                                            darkMode ? 'text-orange-200/80' : 'text-orange-800/80'
                                        }`}
                                    >
                                        {soloStock ? 'Con stock' : 'Sin stock'}
                                    </span>
                                </label>
                                <button
                                    type="button"
                                    onClick={limpiarFiltrosCatalogo}
                                    className={`rounded-xl border px-4 py-2 text-sm font-semibold ${
                                        darkMode
                                            ? 'border-orange-700 text-orange-200 hover:bg-orange-900/40'
                                            : 'border-orange-200 text-orange-900 hover:bg-orange-50'
                                    }`}
                                >
                                    Limpiar
                                </button>
                            </div>

                            {filtrosDinamicosEntries.length > 0 ? (
                                <div
                                    className={`mt-4 border-t pt-4 ${
                                        darkMode ? 'border-orange-900/40' : 'border-orange-100'
                                    }`}
                                >
                                    <p
                                        className={`mb-2 text-xs uppercase tracking-wide ${
                                            darkMode ? 'text-orange-300/70' : 'text-orange-700/80'
                                        }`}
                                    >
                                        Filtros dinámicos
                                    </p>
                                    <div
                                        className={`rounded-xl border px-2 py-2 ${
                                            darkMode ? 'border-orange-900/40 bg-[#202020]/65' : 'border-orange-100 bg-orange-50/35'
                                        }`}
                                    >
                                        <div className="overflow-x-auto pb-1">
                                            <div className="min-w-max space-y-2">
                                                {filtrosCarriles.map((carril, carrilIdx) => (
                                                    <div key={carrilIdx} className="flex items-start gap-2">
                                                        {carril.map(([etiqueta, valores]) => (
                                                            <div
                                                                key={etiqueta}
                                                                className={`w-[200px] rounded-lg p-1.5 ${
                                                                    darkMode ? 'bg-orange-950/30' : 'bg-white/80'
                                                                }`}
                                                            >
                                                                <label className={`${catalogFilterLabelClass} text-[11px] truncate`}>
                                                                    {etiqueta}
                                                                </label>
                                                                <FancySelect
                                                                    accent="orange"
                                                                    value={filtrosVals[etiqueta] || ''}
                                                                    onChange={(val) =>
                                                                        setFiltrosVals((prev) => ({
                                                                            ...prev,
                                                                            [etiqueta]: val || undefined,
                                                                        }))
                                                                    }
                                                                    options={[
                                                                        { value: '', label: 'Cualquiera' },
                                                                        ...((valores || []).map((v) => ({ value: v, label: v }))),
                                                                    ]}
                                                                    darkMode={darkMode}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                        {promoSeleccionadaId ? (
                            <AdminPasswordField
                                id="admin-password-promo-items"
                                className="mt-4 max-w-md"
                                label="Contraseña (solo para agregar a la promoción seleccionada)"
                                value={passwordPromoAcciones}
                                onChange={(e) => setPasswordPromoAcciones(e.target.value)}
                                darkMode={darkMode}
                                labelClass={labelClass}
                                placeholder="Contraseña"
                                autoComplete="new-password"
                            />
                        ) : null}
                        {totalBusqueda > 0 ? (
                            <p className={`mt-3 text-sm font-medium ${darkMode ? 'text-orange-300/90' : 'text-orange-800'}`}>
                                {totalBusqueda} resultado{totalBusqueda !== 1 ? 's' : ''}
                            </p>
                        ) : null}
                        {loadingBusqueda ? (
                            <p className="mt-4 text-sm">Cargando…</p>
                        ) : productosBusqueda.length > 0 ? (
                            <div
                                className={`mt-4 overflow-x-auto rounded-xl border shadow-sm ${
                                    darkMode ? 'border-gray-600/60 bg-gray-950/25' : 'border-gray-200 bg-white'
                                }`}
                            >
                                <table className="w-full min-w-[720px] border-collapse text-sm">
                                    <thead>
                                        <tr
                                            className={
                                                darkMode
                                                    ? 'border-b border-gray-600 bg-gray-800/95 text-left text-gray-200'
                                                    : 'border-b border-orange-200 bg-orange-50/90 text-left text-orange-950'
                                            }
                                        >
                                            <th className="whitespace-nowrap p-3 pl-4 font-semibold">Imagen</th>
                                            <th className="whitespace-nowrap p-3 font-semibold">Clave</th>
                                            <th className="min-w-[12rem] p-3 font-semibold">Descripción</th>
                                            <th className="whitespace-nowrap p-3 font-semibold">Marca</th>
                                            <th className="p-3 pr-4 text-right font-semibold">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {productosBusqueda.map((pr) => {
                                            const imgUrls = getProductoImagenesUrls(pr)
                                            return (
                                                <tr
                                                    key={pr.clave}
                                                    className={
                                                        darkMode
                                                            ? 'border-t border-gray-700/70 transition-colors hover:bg-gray-800/50'
                                                            : 'border-t border-gray-100 transition-colors hover:bg-orange-50/40'
                                                    }
                                                >
                                                    <td className="align-middle p-3 pl-4">
                                                        <ProductoImagenesCelda urls={imgUrls} darkMode={darkMode} rowKey={pr.clave} />
                                                    </td>
                                                    <td className="align-middle p-3 font-mono text-xs text-orange-600 dark:text-orange-300">
                                                        {pr.clave}
                                                    </td>
                                                    <td className="align-middle p-3">
                                                        <span className="line-clamp-2" title={pr.descripcion}>
                                                            {pr.descripcion}
                                                        </span>
                                                    </td>
                                                    <td className="align-middle p-3 text-gray-600 dark:text-gray-400">{pr.marca}</td>
                                                    <td className="align-middle p-3 pr-4 text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() => agregarProductoDesdeBusqueda(pr)}
                                                            className="inline-flex rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-500"
                                                        >
                                                            {promoSeleccionadaId ? 'Agregar a promoción' : 'Agregar a la lista'}
                                                        </button>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : null}
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
                            <h4 className={`mb-3 text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Productos en el borrador</h4>
                            <div
                                className={`overflow-x-auto rounded-xl border shadow-sm ${
                                    darkMode ? 'border-orange-900/40 bg-orange-950/10' : 'border-orange-200 bg-orange-50/30'
                                }`}
                            >
                                <table className="w-full min-w-[720px] border-collapse text-sm">
                                    <thead>
                                        <tr
                                            className={
                                                darkMode
                                                    ? 'border-b border-orange-800/50 bg-orange-950/40 text-left text-orange-100'
                                                    : 'border-b border-orange-200 bg-orange-100/80 text-left text-orange-950'
                                            }
                                        >
                                            <th className="whitespace-nowrap p-3 pl-4 font-semibold">Imagen</th>
                                            <th className="whitespace-nowrap p-3 font-semibold">#</th>
                                            <th className="whitespace-nowrap p-3 font-semibold">Clave</th>
                                            <th className="min-w-[12rem] p-3 font-semibold">Descripción</th>
                                            <th className="whitespace-nowrap p-3 font-semibold">Marca</th>
                                            <th className="p-3 pr-4 text-right font-semibold">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {draftLineas.map((row, idx) => {
                                            const imgUrls = urlsFromDraftRow(row)
                                            return (
                                                <tr
                                                    key={row.clave}
                                                    className={
                                                        darkMode
                                                            ? 'border-t border-orange-900/30 hover:bg-orange-950/25'
                                                            : 'border-t border-orange-100 hover:bg-white/80'
                                                    }
                                                >
                                                    <td className="align-middle p-3 pl-4">
                                                        <ProductoImagenesCelda urls={imgUrls} darkMode={darkMode} rowKey={row.clave} />
                                                    </td>
                                                    <td className="align-middle p-3 text-gray-500">{idx + 1}</td>
                                                    <td className="align-middle p-3 font-mono text-xs text-orange-700 dark:text-orange-300">{row.clave}</td>
                                                    <td className="align-middle p-3">
                                                        <span className="line-clamp-2" title={row.descripcion}>
                                                            {row.descripcion}
                                                        </span>
                                                    </td>
                                                    <td className="align-middle p-3 text-gray-600 dark:text-gray-400">{row.marca}</td>
                                                    <td className="align-middle p-3 pr-4 text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() => quitarDelBorrador(row.clave)}
                                                            className="inline-flex rounded-lg bg-red-600/90 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500"
                                                        >
                                                            Quitar
                                                        </button>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {!promoSeleccionadaId && (
                        <div className="space-y-4 max-w-md border-t border-gray-600/30 dark:border-gray-600 pt-6">
                            <AdminPasswordField
                                id="admin-password-promo-crear"
                                label="Tu contraseña"
                                value={passwordPromoCrear}
                                onChange={(e) => setPasswordPromoCrear(e.target.value)}
                                darkMode={darkMode}
                                labelClass={labelClass}
                                placeholder="Requerida para crear la promoción"
                                autoComplete="new-password"
                            />
                            <InputError messages={errors.promo} />
                            <Button
                                type="button"
                                onClick={crearPromocion}
                                disabled={creandoPromo}
                                className="!bg-orange-600 hover:!bg-orange-500 text-white py-2.5 px-5 rounded-lg font-semibold"
                            >
                                {creandoPromo ? 'Creando…' : 'Crear promoción'}
                            </Button>
                        </div>
                    )}

                    <div>
                        <h3 className={`mb-3 font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Promociones existentes</h3>
                        {promocionesList.length === 0 ? (
                            <p
                                className={`rounded-xl border px-4 py-6 text-sm ${
                                    darkMode ? 'border-gray-600 bg-gray-900/20 text-gray-500' : 'border-gray-200 bg-gray-50 text-gray-600'
                                }`}
                            >
                                Aún no hay promociones.
                            </p>
                        ) : (
                            <div
                                className={`overflow-x-auto rounded-xl border shadow-sm ${
                                    darkMode ? 'border-gray-600/60 bg-gray-950/25' : 'border-gray-200 bg-white'
                                }`}
                            >
                                <table className="w-full min-w-[560px] border-collapse text-sm">
                                    <thead>
                                        <tr
                                            className={
                                                darkMode
                                                    ? 'border-b border-gray-600 bg-gray-800/95 text-left text-gray-200'
                                                    : 'border-b border-gray-200 bg-gray-50 text-left text-gray-900'
                                            }
                                        >
                                            <th className="p-3 pl-4 font-semibold">Título</th>
                                            <th className="min-w-[10rem] p-3 font-semibold">URL</th>
                                            <th className="whitespace-nowrap p-3 font-semibold">Productos</th>
                                            <th className="p-3 pr-4 text-right font-semibold">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {promocionesList.map((p) => (
                                            <tr
                                                key={p.id}
                                                className={
                                                    darkMode
                                                        ? 'border-t border-gray-700/70 hover:bg-gray-800/45'
                                                        : 'border-t border-gray-100 hover:bg-gray-50/90'
                                                }
                                            >
                                                <td className="align-middle p-3 pl-4 font-medium">{p.titulo}</td>
                                                <td className="align-middle p-3">
                                                    <code
                                                        className={`block max-w-md break-all rounded px-2 py-1 text-xs ${
                                                            darkMode ? 'bg-black/30 text-gray-300' : 'bg-gray-100 text-gray-700'
                                                        }`}
                                                    >
                                                        {p.url_tienda}
                                                    </code>
                                                </td>
                                                <td className="align-middle p-3 whitespace-nowrap text-gray-600 dark:text-gray-400">
                                                    {p.items_count} producto{p.items_count !== 1 ? 's' : ''}
                                                </td>
                                                <td className="align-middle p-3 pr-4 text-right">
                                                    <div className="inline-flex flex-wrap justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setPromoSeleccionadaId(promoSeleccionadaId === p.id ? null : p.id)}
                                                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                                                                promoSeleccionadaId === p.id
                                                                    ? 'bg-orange-600 text-white'
                                                                    : darkMode
                                                                      ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                                                                      : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                                                            }`}
                                                        >
                                                            {promoSeleccionadaId === p.id ? 'Deseleccionar' : 'Editar productos'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => eliminarPromocion(p.id)}
                                                            className="rounded-lg bg-red-600/90 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500"
                                                        >
                                                            Eliminar
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {promoSeleccionadaId && promoDetalle && (
                        <div className={`rounded-xl border p-4 ${darkMode ? 'border-gray-600/60 bg-gray-800/40' : 'border-gray-200 bg-gray-50'}`}>
                            <h4 className={`font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Productos en «{promoDetalle.titulo}»</h4>
                            <p className="mt-1 mb-4 text-xs break-all opacity-80">{promoDetalle.url_tienda}</p>
                            {clavesPromoOrden.length === 0 ? (
                                <p className="text-sm opacity-70">Sin productos. Usa el buscador de arriba con contraseña para agregar.</p>
                            ) : loadingPromoItemsProductos ? (
                                <p className="text-sm">Cargando datos de productos…</p>
                            ) : (
                                <div
                                    className={`overflow-x-auto rounded-lg border ${
                                        darkMode ? 'border-gray-600/50 bg-gray-950/20' : 'border-gray-200 bg-white'
                                    }`}
                                >
                                    <table className="w-full min-w-[760px] border-collapse text-sm">
                                        <thead>
                                            <tr
                                                className={
                                                    darkMode
                                                        ? 'border-b border-gray-600 bg-gray-800/95 text-left text-gray-200'
                                                        : 'border-b border-gray-200 bg-gray-100 text-left text-gray-900'
                                                }
                                            >
                                                <th className="whitespace-nowrap p-3 pl-4 font-semibold">Imagen</th>
                                                <th className="whitespace-nowrap p-3 font-semibold">Clave</th>
                                                <th className="min-w-[10rem] p-3 font-semibold">Descripción</th>
                                                <th className="whitespace-nowrap p-3 font-semibold">Marca</th>
                                                <th className="whitespace-nowrap p-3 font-semibold">Vista tienda</th>
                                                <th className="p-3 pr-4 text-right font-semibold">Quitar</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {clavesPromoOrden.map((c) => {
                                                const pr = productoPromoPorClave[c]
                                                const imgUrls = pr ? getProductoImagenesUrls(pr) : []
                                                return (
                                                    <tr
                                                        key={c}
                                                        className={
                                                            darkMode
                                                                ? 'border-t border-gray-700/70 hover:bg-gray-800/45'
                                                                : 'border-t border-gray-100 hover:bg-gray-50/90'
                                                        }
                                                    >
                                                        <td className="align-middle p-3 pl-4">
                                                            {pr ? (
                                                                <ProductoImagenesCelda urls={imgUrls} darkMode={darkMode} rowKey={`promo-${c}`} />
                                                            ) : (
                                                                <span
                                                                    className={`inline-flex min-h-[4.5rem] min-w-[4.5rem] items-center justify-center rounded-lg border text-[10px] font-medium uppercase leading-tight px-1 text-center ${
                                                                        darkMode
                                                                            ? 'border-orange-900/50 bg-orange-950/30 text-orange-400/90'
                                                                            : 'border-orange-200 bg-orange-50 text-orange-800'
                                                                    }`}
                                                                >
                                                                    No en catálogo
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="align-middle p-3 font-mono text-xs text-orange-600 dark:text-orange-300">{c}</td>
                                                        <td className="align-middle p-3">
                                                            <span className="line-clamp-2" title={pr?.descripcion || ''}>
                                                                {pr?.descripcion || '—'}
                                                            </span>
                                                        </td>
                                                        <td className="align-middle p-3 text-gray-600 dark:text-gray-400">{pr?.marca || '—'}</td>
                                                        <td className="align-middle p-3">
                                                            <Link
                                                                href={`/tienda/producto/${encodeURIComponent(c)}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className={`inline-flex text-xs font-semibold underline decoration-2 underline-offset-2 ${
                                                                    darkMode ? 'text-orange-400 hover:text-orange-300' : 'text-orange-700 hover:text-orange-900'
                                                                }`}
                                                            >
                                                                Ver ficha
                                                            </Link>
                                                        </td>
                                                        <td className="align-middle p-3 pr-4 text-right">
                                                            <button
                                                                type="button"
                                                                onClick={() => quitarDePromocion(c)}
                                                                className="inline-flex rounded-lg bg-red-600/90 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500"
                                                            >
                                                                Quitar
                                                            </button>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* 3. Cargar banner */}
            <div className={card}>
                <div className={`px-5 py-4 ${darkMode ? 'bg-orange-600/25 border-b border-orange-500/30' : 'bg-orange-50 border-b border-orange-200'}`}>
                    <div className="flex items-center gap-3">
                        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${darkMode ? 'bg-orange-500/30 text-orange-300' : 'bg-orange-100 text-orange-600'}`}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                        </span>
                        <h2 className={`text-lg font-bold ${darkMode ? 'text-orange-200' : 'text-orange-800'}`}>Cargar imagen al carrusel</h2>
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
                                        ? 'file:bg-orange-600 file:text-white file:hover:bg-orange-500 text-gray-300'
                                        : 'file:bg-orange-600 file:text-white file:hover:bg-orange-700 text-gray-700'
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
                        {promocionesList.length > 0 && (
                            <div>
                                <Label className={labelClass}>Enlace al hacer clic (opcional)</Label>
                                <select
                                    value={enlaceBanner}
                                    onChange={(e) => setEnlaceBanner(e.target.value)}
                                    className={inputClass}
                                    aria-label="Enlace al hacer clic en el banner"
                                >
                                    <option value="">— Sin enlace —</option>
                                    {promocionesList.map((p) => (
                                        <option key={p.id} value={p.url_tienda}>
                                            {p.titulo} ({p.url_tienda})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div className="max-w-md">
                            <AdminPasswordField
                                id="admin-password-banner"
                                label="Tu contraseña"
                                value={passwordBanner}
                                onChange={(e) => setPasswordBanner(e.target.value)}
                                darkMode={darkMode}
                                labelClass={labelClass}
                                placeholder="Requerida para subir"
                                autoComplete="new-password"
                            />
                            <InputError messages={errors.admin_password} />
                        </div>
                        <InputError messages={errors.general} />
                        <Button
                            type="submit"
                            disabled={uploading || !selectedFile}
                            className={`w-full sm:w-auto py-3 px-6 rounded-lg font-semibold flex items-center justify-center gap-2 ${
                                darkMode ? '!bg-orange-500 hover:!bg-orange-400' : '!bg-orange-600 hover:!bg-orange-700'
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
                                            <span className="text-xs break-all text-orange-500 block">Enlace: {img.enlace}</span>
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
