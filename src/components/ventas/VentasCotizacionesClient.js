'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Input from '@/components/Input'
import Label from '@/components/Label'
import SwitchToggle from '@/components/SwitchToggle'
import { useAdminTheme } from '@/contexts/AdminThemeContext'
import {
    getCategoriasPrincipales,
    getFiltrosDinamicos,
    getFiltrosDinamicosBusqueda,
    getMarcas,
    getProductos,
    resolveStorageUrl,
} from '@/lib/productos'
import { downloadCotizacionPdf } from '@/lib/cotizacionPdf'
import {
    createVentasCotizacion,
    deleteVentasCotizacion,
    fetchVentasCotizacionReglasPrecio,
    fetchVentasCotizaciones,
    searchVentasClientes,
    updateVentasCotizacion,
} from '@/lib/ventasCotizacionesApi'

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

function stockTiendaProducto(p) {
    return (Number(p?.disponible) || 0) + (Number(p?.disponible_cd) || 0)
}

const PRODUCTOS_CATALOGO_POR_PAGINA = 5

function hrefProductoTienda(clave) {
    const c = clave != null ? String(clave).trim() : ''
    return c ? `/tienda/producto/${encodeURIComponent(c)}` : null
}

function NombreProductoLink({ clave, nombre, darkMode }) {
    const href = hrefProductoTienda(clave)
    const className = `line-clamp-2 font-medium underline-offset-2 hover:underline ${
        darkMode ? 'text-orange-200 hover:text-orange-100' : 'text-orange-900 hover:text-orange-800'
    }`
    if (!href) {
        return (
            <span className={className} title={nombre}>
                {nombre}
            </span>
        )
    }
    return (
        <Link href={href} target="_blank" rel="noopener noreferrer" className={className} title={nombre}>
            {nombre}
        </Link>
    )
}

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
            <span
                className={`inline-flex min-h-[4.5rem] min-w-[4.5rem] items-center justify-center rounded-2xl border text-[10px] font-medium uppercase leading-tight px-1 text-center ${
                    darkMode ? 'border-orange-800/60 bg-[#262626] text-orange-400/80' : 'border-orange-100 bg-orange-50 text-orange-400'
                }`}
            >
                Sin imagen
            </span>
        )
    }
    const cur = list[safe]
    return (
        <div className="flex w-[5.75rem] shrink-0 flex-col items-stretch gap-1">
            <div
                className={`aspect-square overflow-hidden rounded-2xl border shadow-sm ${
                    darkMode ? 'border-orange-800/50 bg-[#202020]' : 'border-orange-100 bg-white'
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
                            className={`min-w-[1.25rem] rounded-lg px-1 py-0.5 text-[10px] font-bold leading-none transition-colors ${
                                i === safe
                                    ? darkMode
                                        ? 'bg-orange-600 text-white ring-1 ring-orange-300/40'
                                        : 'bg-orange-700 text-white shadow-sm'
                                    : darkMode
                                      ? 'bg-[#262626] text-orange-300/80 hover:bg-orange-950/80'
                                      : 'bg-orange-100 text-orange-800 hover:bg-orange-200'
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

/** Slots para barra tipo admin: ventanas, elipsis y última página. */
function buildPaginationSlots(current, last) {
    if (last <= 1) return [1]
    const delta = 2
    const pages = new Set([1, last])
    for (let i = current - delta; i <= current + delta; i++) {
        if (i >= 1 && i <= last) pages.add(i)
    }
    const sorted = [...pages].sort((a, b) => a - b)
    const out = []
    for (let i = 0; i < sorted.length; i++) {
        const n = sorted[i]
        if (i > 0) {
            const prev = sorted[i - 1]
            if (n - prev === 2) out.push(prev + 1)
            else if (n - prev > 2) out.push('ellipsis')
        }
        out.push(n)
    }
    return out
}

function VentasPaginationPink({ current, lastPage, onPageChange, darkMode }) {
    if (lastPage <= 1) return null
    const slots = buildPaginationSlots(current, lastPage)
    const btnBase =
        'inline-flex h-10 min-w-[2.5rem] items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-35 disabled:pointer-events-none'
    const inactive = darkMode
        ? 'bg-[#262626]/90 text-orange-100/80 hover:bg-orange-950/50 border border-orange-800/50'
        : 'bg-orange-50/80 text-orange-950 hover:bg-orange-100 border border-orange-100'
    const active = darkMode
        ? 'bg-gradient-to-br from-[#FF8000] to-[#e67300] text-white border border-orange-400/25 shadow-md shadow-black/30'
        : 'bg-gradient-to-br from-[#FF8000] to-[#e67300] text-white border border-orange-300/40 shadow-md shadow-orange-900/15'

    return (
        <div
            className={`flex flex-wrap items-center justify-center gap-1.5 rounded-2xl px-3 py-3.5 ${
                darkMode ? 'border border-orange-900/40 bg-[#1c1c1c]/80' : 'border border-orange-100 bg-orange-50/50'
            }`}
        >
            <button
                type="button"
                className={`${btnBase} ${inactive} px-2.5`}
                disabled={current <= 1}
                onClick={() => onPageChange(1)}
                aria-label="Primera página"
            >
                «
            </button>
            <button
                type="button"
                className={`${btnBase} ${inactive} px-2.5`}
                disabled={current <= 1}
                onClick={() => onPageChange(current - 1)}
                aria-label="Página anterior"
            >
                ‹
            </button>
            {slots.map((s, idx) =>
                s === 'ellipsis' ? (
                    <span
                        key={`e-${idx}`}
                        className={`inline-flex h-10 min-w-[2.5rem] items-center justify-center rounded-xl text-sm ${
                            darkMode ? 'text-orange-400/70' : 'text-orange-400'
                        }`}
                    >
                        …
                    </span>
                ) : (
                    <button
                        key={`p-${s}`}
                        type="button"
                        className={`${btnBase} ${s === current ? active : inactive}`}
                        onClick={() => onPageChange(s)}
                    >
                        {s}
                    </button>
                )
            )}
            <button
                type="button"
                className={`${btnBase} ${inactive} px-2.5`}
                disabled={current >= lastPage}
                onClick={() => onPageChange(current + 1)}
                aria-label="Página siguiente"
            >
                ›
            </button>
            <button
                type="button"
                className={`${btnBase} ${inactive} px-2.5`}
                disabled={current >= lastPage}
                onClick={() => onPageChange(lastPage)}
                aria-label="Última página"
            >
                »
            </button>
        </div>
    )
}

function lineSubtotal(l) {
    const qty = Math.max(1, Number(l.cantidad) || 1)
    const price = Number(l.precio_unitario) || 0
    const lp = Math.min(100, Math.max(0, Number(l.descuento_linea_pct) || 0))
    return qty * price * (1 - lp / 100)
}

function grandTotal(lineas, generalPct) {
    const sum = lineas.reduce((s, l) => s + lineSubtotal(l), 0)
    const gp = Math.min(100, Math.max(0, Number(generalPct) || 0))
    return Math.round(sum * (1 - gp / 100) * 100) / 100
}

function precioMinimoUnitario(precioRef, margenPct) {
    const ref = Number(precioRef) || 0
    if (ref <= 0) return 0
    const m = Math.min(100, Math.max(0, Number(margenPct) || 0))
    return Math.round(ref * (1 - m / 100) * 10000) / 10000
}

/** Descuento máximo por línea según precio unitario vs precio de catálogo. */
function maxDescuentoLineaPct(linea, margenPct) {
    const ref = Number(linea.precio_referencia) || Number(linea.precio_unitario) || 0
    const unit = Number(linea.precio_unitario) || 0
    if (ref <= 0 || unit <= 0) return Math.min(100, Math.max(0, Number(margenPct) || 0))
    const minUnit = precioMinimoUnitario(ref, margenPct)
    if (unit <= minUnit + 0.0001) return 0
    return Math.min(100, Math.max(0, (1 - minUnit / unit) * 100))
}

function precioUnitarioMinimoPermitido(linea, margenPct) {
    const ref = Number(linea.precio_referencia) || Number(linea.precio_unitario) || 0
    const linePct = Math.min(100, Math.max(0, Number(linea.descuento_linea_pct) || 0))
    const piso = precioMinimoUnitario(ref, margenPct)
    if (piso <= 0) return 0
    const divisor = 1 - linePct / 100
    if (divisor <= 0) return piso
    return Math.round((piso / divisor) * 10000) / 10000
}

function validarMargenCotizacion(lineas, generalPct, margenPct) {
    const margen = Math.min(100, Math.max(0, Number(margenPct) || 0))
    if (margen <= 0 || !lineas.length) return { ok: true }

    let minimoTotal = 0
    for (const l of lineas) {
        const ref = Number(l.precio_referencia) || Number(l.precio_unitario) || 0
        if (ref <= 0) continue
        const qty = Math.max(1, Number(l.cantidad) || 1)
        const pisoLinea = qty * precioMinimoUnitario(ref, margen)
        const subLinea = lineSubtotal(l)
        minimoTotal += pisoLinea
        if (subLinea + 0.009 < pisoLinea) {
            return {
                ok: false,
                message: `La línea ${l.clave} supera el descuento máximo permitido (${margen}% sobre el precio de catálogo).`,
            }
        }
    }

    minimoTotal = Math.round(minimoTotal * 100) / 100
    const total = grandTotal(lineas, generalPct)
    if (minimoTotal > 0 && total + 0.009 < minimoTotal) {
        return {
            ok: false,
            message: `El total no puede ser menor a $${minimoTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })} (máximo ${margen}% de descuento sobre catálogo).`,
        }
    }

    return { ok: true }
}

/** Ajusta precios unitarios para que la tabla del PDF cuadre con el total (descuento general proporcional). */
function buildPdfItemsFromLineas(lineas, generalPct) {
    const gp = Math.min(100, Math.max(0, Number(generalPct) || 0))
    const rows = lineas.map((l) => {
        const qty = Math.max(1, Number(l.cantidad) || 1)
        const base = lineSubtotal(l)
        return { ...l, qty, base }
    })
    const sumBase = rows.reduce((s, r) => s + r.base, 0)
    const factor = sumBase > 0 ? (sumBase * (1 - gp / 100)) / sumBase : 1
    return rows.map((r) => {
        const sub = Math.round(r.base * factor * 100) / 100
        const unit = r.qty > 0 ? Math.round((sub / r.qty) * 10000) / 10000 : 0
        return {
            clave: r.clave,
            cantidad: r.qty,
            nombre_producto: r.nombre_producto,
            precio_unitario: unit,
            subtotal: sub,
        }
    })
}

export default function VentasCotizacionesClient() {
    const { darkMode } = useAdminTheme()

    const card = useMemo(
        () =>
            darkMode
                ? 'rounded-[1.75rem] border border-orange-900/40 bg-[#262626]/95 shadow-[0_24px_64px_-24px_rgba(0,0,0,0.45)] overflow-hidden'
                : 'rounded-[1.75rem] border border-orange-100 bg-white shadow-[0_20px_50px_-20px_rgba(91,77,122,0.12)] overflow-hidden',
        [darkMode]
    )

    const labelClass = darkMode ? 'text-orange-200/85 font-medium' : 'text-orange-950 font-medium'
    const inputClass = darkMode
        ? 'mt-1.5 block w-full rounded-xl border border-orange-800/50 bg-[#202020]/80 px-3.5 py-2.5 text-sm text-gray-100 placeholder:text-orange-400/50 focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 outline-none transition-shadow'
        : 'mt-1.5 block w-full rounded-xl border border-orange-100 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-orange-300 focus:ring-2 focus:ring-orange-200/80 outline-none transition-shadow'

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

    const [lineas, setLineas] = useState([])
    const [descuentoGeneralPct, setDescuentoGeneralPct] = useState('')
    const [clienteBusqueda, setClienteBusqueda] = useState('')
    const [clienteOpciones, setClienteOpciones] = useState([])
    const [clienteSeleccionado, setClienteSeleccionado] = useState(null)
    const [invitadoNombre, setInvitadoNombre] = useState('')
    const [invitadoEmail, setInvitadoEmail] = useState('')
    const [invitadoTelefono, setInvitadoTelefono] = useState('')
    const [comentario, setComentario] = useState('')

    const [editingId, setEditingId] = useState(null)
    const [editingFolio, setEditingFolio] = useState('')
    const [savedRows, setSavedRows] = useState([])
    const [savedMeta, setSavedMeta] = useState({ current_page: 1, last_page: 1, per_page: 10, total: 0 })
    const savedPageRef = useRef(1)
    const [loadingSaved, setLoadingSaved] = useState(false)
    const [saving, setSaving] = useState(false)
    const [formError, setFormError] = useState('')
    const [successMsg, setSuccessMsg] = useState('')
    const [mainTab, setMainTab] = useState('cotizar')
    const [maxDescuentoPct, setMaxDescuentoPct] = useState(10)

    useEffect(() => {
        fetchVentasCotizacionReglasPrecio()
            .then(setMaxDescuentoPct)
            .catch(() => setMaxDescuentoPct(10))
    }, [])

    const subOpciones = useMemo(() => {
        const cat = categorias.find((c) => c.id === catPrincipal)
        if (!cat) return []
        return Array.isArray(cat.subcategorias) ? cat.subcategorias : []
    }, [categorias, catPrincipal])

    const filtrosActivos = useMemo(
        () => Object.fromEntries(Object.entries(filtrosVals).filter(([, v]) => v != null && String(v).trim() !== '')),
        [filtrosVals]
    )

    useEffect(() => {
        getCategoriasPrincipales().then((c) => setCategorias(Array.isArray(c) ? c : []))
    }, [])

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
                const params = { page, per_page: PRODUCTOS_CATALOGO_POR_PAGINA }
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
            } catch {
                setProductosBusqueda([])
            } finally {
                setLoadingBusqueda(false)
            }
        },
        [pageBusqueda, soloStock, marca, busquedaQ, catPrincipal, subcategoria, filtrosActivos]
    )

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
                const params = { page: 1, per_page: PRODUCTOS_CATALOGO_POR_PAGINA }
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
            } catch {
                setProductosBusqueda([])
            } finally {
                setLoadingBusqueda(false)
            }
        }, delay)
        return () => clearTimeout(t)
    }, [catPrincipal, subcategoria, marca, soloStock, filtrosActivos, busquedaQ])

    const loadSaved = useCallback(async (page = 1) => {
        setLoadingSaved(true)
        try {
            const { rows, meta } = await fetchVentasCotizaciones(page, 10)
            setSavedRows(rows)
            setSavedMeta(meta)
            savedPageRef.current = meta.current_page || page
        } catch (e) {
            setFormError(e?.message || 'No se pudieron cargar las cotizaciones guardadas.')
        } finally {
            setLoadingSaved(false)
        }
    }, [])

    useEffect(() => {
        loadSaved(1)
    }, [loadSaved])

    useEffect(() => {
        const q = clienteBusqueda.trim()
        if (q.length < 2) {
            setClienteOpciones([])
            return undefined
        }
        const t = setTimeout(async () => {
            try {
                const list = await searchVentasClientes(q)
                setClienteOpciones(Array.isArray(list) ? list : [])
            } catch {
                setClienteOpciones([])
            }
        }, 320)
        return () => clearTimeout(t)
    }, [clienteBusqueda])

    const totalCotizacion = useMemo(
        () => grandTotal(lineas, descuentoGeneralPct === '' ? 0 : Number(descuentoGeneralPct)),
        [lineas, descuentoGeneralPct]
    )

    const lastPageBusqueda = useMemo(
        () => Math.max(1, Math.ceil(totalBusqueda / PRODUCTOS_CATALOGO_POR_PAGINA)),
        [totalBusqueda]
    )

    const agregarProducto = (pr) => {
        const urls = getProductoImagenesUrls(pr)
        const img = urls[0] || null
        const stock = stockTiendaProducto(pr)
        setLineas((prev) => {
            const i = prev.findIndex((x) => x.clave === pr.clave)
            if (i >= 0) {
                const next = [...prev]
                const row = { ...next[i] }
                row.cantidad = Math.min(99999, (Number(row.cantidad) || 1) + 1)
                next[i] = row
                return next
            }
            const precioCat = Number(pr.precio) || 0
            return [
                ...prev,
                {
                    clave: pr.clave,
                    cantidad: 1,
                    nombre_producto: pr.descripcion || pr.clave,
                    precio_unitario: precioCat,
                    precio_referencia: precioCat,
                    imagen: img,
                    imagenes_urls: urls,
                    stock_tienda: stock,
                    descuento_linea_pct: 0,
                },
            ]
        })
    }

    const resetFormulario = () => {
        setLineas([])
        setDescuentoGeneralPct('')
        setClienteSeleccionado(null)
        setClienteBusqueda('')
        setClienteOpciones([])
        setInvitadoNombre('')
        setInvitadoEmail('')
        setInvitadoTelefono('')
        setComentario('')
        setEditingId(null)
        setEditingFolio('')
        setFormError('')
    }

    const cargarParaEditar = (row) => {
        setMainTab('cotizar')
        setEditingId(row.id)
        setEditingFolio(row.folio || `CV-${String(new Date(row.created_at || Date.now()).getFullYear())}-${String(row.id).padStart(6, '0')}`)
        setLineas(
            (row.items || []).map((it) => {
                const unit = Number(it.precio_unitario) || 0
                const ref = Number(it.precio_referencia) > 0 ? Number(it.precio_referencia) : unit
                return {
                    clave: it.clave,
                    cantidad: it.cantidad,
                    nombre_producto: it.nombre_producto,
                    precio_unitario: unit,
                    precio_referencia: ref,
                    imagen: it.imagen,
                    imagenes_urls: it.imagen ? [it.imagen] : [],
                    stock_tienda: it.stock_tienda ?? null,
                    descuento_linea_pct: it.descuento_linea_pct ?? 0,
                }
            })
        )
        setDescuentoGeneralPct(String(row.descuento_general_pct ?? 0))
        setClienteSeleccionado(row.cliente_registrado || null)
        setClienteBusqueda(row.cliente_registrado ? `${row.cliente_registrado.name} · ${row.cliente_registrado.email}` : '')
        setInvitadoNombre(row.invitado_nombre || '')
        setInvitadoEmail(row.invitado_email || '')
        setInvitadoTelefono(row.invitado_telefono || '')
        setComentario(row.comentario || '')
        setFormError('')
        setSuccessMsg('')
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const payloadForApi = () => {
        const dg = descuentoGeneralPct === '' ? 0 : Number(descuentoGeneralPct)
        return {
            cliente_user_id: clienteSeleccionado?.id ?? null,
            invitado_nombre: invitadoNombre.trim() || null,
            invitado_email: invitadoEmail.trim() || null,
            invitado_telefono: invitadoTelefono.trim() || null,
            comentario: comentario.trim() || null,
            descuento_general_pct: Number.isFinite(dg) ? dg : 0,
            items: lineas.map((l) => {
                const unit = Number(l.precio_unitario) || 0
                const ref = Number(l.precio_referencia) > 0 ? Number(l.precio_referencia) : unit
                return {
                    clave: l.clave,
                    cantidad: Math.max(1, Number(l.cantidad) || 1),
                    nombre_producto: l.nombre_producto,
                    precio_unitario: unit,
                    precio_referencia: ref,
                    imagen: l.imagen || null,
                    stock_tienda: l.stock_tienda != null ? Number(l.stock_tienda) : null,
                    descuento_linea_pct: Number(l.descuento_linea_pct) || 0,
                }
            }),
        }
    }

    const handleGuardar = async () => {
        if (!lineas.length) {
            setFormError('Agrega al menos un producto a la cotización.')
            return
        }
        const margenCheck = validarMargenCotizacion(lineas, descuentoGeneralPct === '' ? 0 : Number(descuentoGeneralPct), maxDescuentoPct)
        if (!margenCheck.ok) {
            setFormError(margenCheck.message)
            return
        }
        setSaving(true)
        setFormError('')
        setSuccessMsg('')
        try {
            const payload = payloadForApi()
            if (editingId) {
                await updateVentasCotizacion(editingId, payload)
                setSuccessMsg('Cotización actualizada correctamente.')
            } else {
                await createVentasCotizacion(payload)
                setSuccessMsg('Cotización guardada correctamente.')
            }
            setMainTab('guardadas')
            resetFormulario()
            await loadSaved(savedPageRef.current || 1)
        } catch (err) {
            const d = err?.response?.data
            const msg =
                d?.message ||
                (typeof d?.errors === 'object' ? Object.values(d.errors).flat().join(' ') : null) ||
                err?.message ||
                'Error al guardar.'
            setFormError(msg)
        } finally {
            setSaving(false)
        }
    }

    const handleEliminar = async (id) => {
        if (!window.confirm('¿Eliminar esta cotización? Esta acción no se puede deshacer.')) return
        try {
            await deleteVentasCotizacion(id)
            if (editingId === id) resetFormulario()
            setSuccessMsg('Cotización eliminada.')
            await loadSaved(savedPageRef.current || 1)
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || 'Error al eliminar.'
            setFormError(msg)
        }
    }

    const handlePdf = async (row) => {
        const items = buildPdfItemsFromLineas(
            (row.items || []).map((it) => ({
                clave: it.clave,
                cantidad: it.cantidad,
                nombre_producto: it.nombre_producto,
                precio_unitario: it.precio_unitario,
                descuento_linea_pct: it.descuento_linea_pct ?? 0,
            })),
            row.descuento_general_pct ?? 0
        )
        const total = Number(row.total) || 0
        const folio = row.folio || `CV-${new Date().getFullYear()}-${String(row.id).padStart(6, '0')}`
        const nombre = `Cotizacion_${folio.replace(/[^a-zA-Z0-9\-]/g, '_')}.pdf`
        await downloadCotizacionPdf(items, total, nombre, folio)
    }

    const fmtFecha = (iso) => {
        if (!iso) return '—'
        try {
            return new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
        } catch {
            return iso
        }
    }

    const nombreClienteMostrar = (row) => {
        if (row.cliente_registrado) {
            return row.cliente_registrado.name || row.cliente_registrado.email
        }
        const bits = [row.invitado_nombre, row.invitado_email].filter(Boolean)
        return bits.length ? bits.join(' · ') : '—'
    }

    return (
        <div className="space-y-8 pb-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h1 className={`text-2xl font-semibold tracking-tight sm:text-3xl ${darkMode ? 'text-gray-100' : 'text-orange-950'}`}>
                    Nueva cotización
                </h1>
                <div
                    className={`inline-flex shrink-0 rounded-xl border p-1 ${
                        darkMode ? 'border-orange-800/50 bg-[#1c1c1c]/80' : 'border-orange-100 bg-white/90 shadow-sm'
                    }`}
                    role="tablist"
                    aria-label="Sección cotizaciones"
                >
                    <button
                        type="button"
                        role="tab"
                        aria-selected={mainTab === 'cotizar'}
                        onClick={() => setMainTab('cotizar')}
                        className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                            mainTab === 'cotizar'
                                ? darkMode
                                    ? 'bg-orange-600/30 text-orange-100 shadow-inner'
                                    : 'bg-orange-100 text-orange-950'
                                : darkMode
                                  ? 'text-orange-300/70 hover:bg-white/5'
                                  : 'text-orange-800/70 hover:bg-orange-50/80'
                        }`}
                    >
                        Cotizar
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={mainTab === 'guardadas'}
                        onClick={() => setMainTab('guardadas')}
                        className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                            mainTab === 'guardadas'
                                ? darkMode
                                    ? 'bg-orange-600/30 text-orange-100 shadow-inner'
                                    : 'bg-orange-100 text-orange-950'
                                : darkMode
                                  ? 'text-orange-300/70 hover:bg-white/5'
                                  : 'text-orange-800/70 hover:bg-orange-50/80'
                        }`}
                    >
                        Guardadas
                    </button>
                </div>
            </div>

            {successMsg ? (
                <div
                    className={`rounded-2xl border px-4 py-3.5 text-sm font-medium ${
                        darkMode
                            ? 'border-emerald-800/50 bg-emerald-950/40 text-emerald-100'
                            : 'border-emerald-200/80 bg-emerald-50/90 text-emerald-900'
                    }`}
                >
                    {successMsg}
                </div>
            ) : null}
            {formError ? (
                <div
                    className={`rounded-2xl border px-4 py-3.5 text-sm font-medium ${
                        darkMode ? 'border-rose-900/50 bg-rose-950/35 text-rose-100' : 'border-rose-200/80 bg-rose-50 text-rose-900'
                    }`}
                >
                    {formError}
                </div>
            ) : null}

            {mainTab === 'cotizar' && (
            <div className={card}>
                {editingId ? (
                    <div
                        className={`border-b px-6 py-5 sm:px-8 ${
                            darkMode
                                ? 'border-orange-900/40 bg-gradient-to-r from-[#262626] to-[#1c1c1c]/80'
                                : 'border-orange-100 bg-gradient-to-r from-white to-orange-50/60'
                        }`}
                    >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <h2 className={`text-lg font-semibold tracking-tight sm:text-xl ${darkMode ? 'text-gray-100' : 'text-orange-950'}`}>
                                Editar · {editingFolio || `#${editingId}`}
                            </h2>
                            <span
                                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                                    darkMode ? 'bg-orange-600/25 text-orange-100 ring-1 ring-orange-400/30' : 'bg-orange-100 text-orange-900 ring-1 ring-orange-200/80'
                                }`}
                            >
                                Modo edición
                            </span>
                        </div>
                    </div>
                ) : null}

                <div className="p-5 sm:p-8">
                    <div className="md:grid md:grid-cols-[1fr_min(19rem,100%)] md:gap-8">
                        <div className="space-y-5 min-w-0">
                            <div
                                className={`rounded-2xl border p-4 sm:p-5 ${
                                    darkMode ? 'border-orange-900/35 bg-[#202020]/50' : 'border-orange-100 bg-orange-50/40'
                                }`}
                            >
                                <Label className={labelClass}>Búsqueda en catálogo</Label>
                                <Input
                                    value={busquedaQ}
                                    onChange={(e) => setBusquedaQ(e.target.value)}
                                    className={inputClass}
                                    placeholder="Nombre, clave o palabra clave…"
                                />
                            </div>

                            {loadingBusqueda ? (
                                <div className={`flex items-center gap-3 py-8 text-sm ${darkMode ? 'text-orange-200/75' : 'text-orange-800/80'}`}>
                                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-orange-400/30 border-t-orange-500" />
                                    Cargando resultados…
                                </div>
                            ) : productosBusqueda.length > 0 ? (
                                <div
                                    className={`overflow-hidden rounded-2xl border shadow-sm ${
                                        darkMode ? 'border-orange-900/40 bg-[#202020]/40' : 'border-orange-100 bg-white'
                                    }`}
                                >
                                    <table className="w-full min-w-[720px] border-collapse text-sm">
                                        <thead>
                                            <tr
                                                className={
                                                    darkMode
                                                        ? 'border-b border-orange-900/50 bg-[#262626]/90 text-left text-[11px] font-semibold uppercase tracking-wide text-orange-300/80'
                                                        : 'border-b border-orange-100 bg-orange-50/90 text-left text-[11px] font-semibold uppercase tracking-wide text-orange-900/80'
                                                }
                                            >
                                                <th className="whitespace-nowrap p-3.5 pl-5">Imagen</th>
                                                <th className="whitespace-nowrap p-3.5">Clave</th>
                                                <th className="min-w-[12rem] p-3.5">Producto</th>
                                                <th className="whitespace-nowrap p-3.5">Stock</th>
                                                <th className="whitespace-nowrap p-3.5">Precio</th>
                                                <th className="p-3.5 pr-5 text-right">Acción</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {productosBusqueda.map((pr) => {
                                                const imgUrls = getProductoImagenesUrls(pr)
                                                const stock = stockTiendaProducto(pr)
                                                return (
                                                    <tr
                                                        key={pr.clave}
                                                        className={
                                                            darkMode
                                                                ? 'border-t border-orange-900/40 transition-colors hover:bg-orange-950/35'
                                                                : 'border-t border-orange-50 transition-colors hover:bg-orange-50/70'
                                                        }
                                                    >
                                                        <td className="align-middle p-3.5 pl-5">
                                                            <ProductoImagenesCelda urls={imgUrls} darkMode={darkMode} rowKey={pr.clave} />
                                                        </td>
                                                        <td className="align-middle p-3.5 font-mono text-xs text-orange-800 dark:text-orange-200/90">
                                                            {pr.clave}
                                                        </td>
                                                        <td className="align-middle p-3.5">
                                                            <NombreProductoLink
                                                                clave={pr.clave}
                                                                nombre={pr.descripcion}
                                                                darkMode={darkMode}
                                                            />
                                                        </td>
                                                        <td className={`align-middle p-3.5 tabular-nums ${darkMode ? 'text-orange-200/70' : 'text-gray-600'}`}>{stock}</td>
                                                        <td className={`align-middle p-3.5 tabular-nums font-medium ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                                                            ${Number(pr.precio || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="align-middle p-3.5 pr-5 text-right">
                                                            <button
                                                                type="button"
                                                                onClick={() => agregarProducto(pr)}
                                                                className="inline-flex items-center rounded-full bg-gradient-to-r from-[#FF8000] to-[#e67300] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-orange-900/20 transition hover:brightness-105 active:scale-[0.98]"
                                                            >
                                                                Agregar
                                                            </button>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className={`rounded-2xl border px-4 py-6 text-sm ${darkMode ? 'border-orange-900/40 text-orange-300/70' : 'border-orange-100 bg-orange-50/40 text-orange-900/70'}`}>
                                    Sin resultados. Usa el buscador o los filtros.
                                </p>
                            )}

                            {totalBusqueda > 0 ? (
                                <div className="flex flex-col gap-3 pt-1">
                                    <p className={`text-xs ${darkMode ? 'text-orange-300/65' : 'text-orange-800/70'}`}>
                                        Página {pageBusqueda} · {totalBusqueda} resultados
                                    </p>
                                    {lastPageBusqueda > 1 ? (
                                        <VentasPaginationPink
                                            current={pageBusqueda}
                                            lastPage={lastPageBusqueda}
                                            onPageChange={(p) => ejecutarBusquedaProductos(p)}
                                            darkMode={darkMode}
                                        />
                                    ) : null}
                                </div>
                            ) : null}
                        </div>

                        <aside
                            className={`mt-8 max-h-[72vh] space-y-5 overflow-y-auto rounded-2xl border p-5 sm:p-6 md:mt-0 ${
                                darkMode
                                    ? 'border-orange-900/40 bg-[#1c1c1c]/60 ring-1 ring-white/[0.04]'
                                    : 'border-orange-100 bg-orange-50/50 ring-1 ring-orange-100/80'
                            }`}
                        >
                            <div>
                                <h3 className={`text-xs font-semibold uppercase tracking-[0.18em] ${darkMode ? 'text-orange-200/90' : 'text-orange-900/85'}`}>
                                    Filtros
                                </h3>
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
                            <div className={`flex items-center gap-3 rounded-xl px-1 py-1 ${darkMode ? 'text-orange-100/85' : 'text-orange-950'}`}>
                                <SwitchToggle
                                    id="solo-stock-ventas-cot"
                                    checked={soloStock}
                                    onChange={setSoloStock}
                                    darkMode={darkMode}
                                    aria-label="Solo con stock"
                                />
                                <label htmlFor="solo-stock-ventas-cot" className="cursor-pointer select-none text-sm">
                                    Solo con stock en tienda
                                </label>
                            </div>
                            {Object.keys(filtrosDinamicos).length > 0 ? (
                                <div className={`space-y-4 border-t pt-5 ${darkMode ? 'border-orange-900/40' : 'border-orange-100'}`}>
                                    <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-orange-300/70' : 'text-orange-900/70'}`}>
                                        Filtros dinámicos
                                    </p>
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
                            ) : null}
                        </aside>
                    </div>

                    <div
                        className={`mt-10 space-y-6 rounded-[1.5rem] border p-5 sm:p-7 ${
                            darkMode
                                ? 'border-orange-900/35 bg-gradient-to-b from-[#262626]/50 to-[#1c1c1c]/30'
                                : 'border-orange-100 bg-gradient-to-b from-white to-orange-50/40'
                        }`}
                    >
                        <div className="flex flex-wrap items-end justify-between gap-3">
                            <h3 className={`text-base font-semibold tracking-tight sm:text-lg ${darkMode ? 'text-gray-100' : 'text-orange-950'}`}>
                                Detalle de la cotización
                            </h3>
                            {lineas.length > 0 ? (
                                <span
                                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                                        darkMode ? 'bg-orange-600/20 text-orange-100 ring-1 ring-orange-500/30' : 'bg-orange-100 text-orange-900 ring-1 ring-orange-200/80'
                                    }`}
                                >
                                    {lineas.length} producto{lineas.length !== 1 ? 's' : ''}
                                </span>
                            ) : null}
                        </div>
                        {lineas.length === 0 ? (
                            <p className={`rounded-2xl border px-4 py-8 text-center text-sm ${darkMode ? 'border-orange-900/40 text-orange-300/65' : 'border-orange-100 bg-white text-orange-900/70'}`}>
                                Vacío. Agrega productos desde la tabla superior.
                            </p>
                        ) : (
                            <div className="overflow-x-auto rounded-2xl">
                                <div
                                    className={`inline-block min-w-full overflow-hidden rounded-2xl border ${darkMode ? 'border-orange-900/40' : 'border-orange-100'}`}
                                >
                                    <table className="w-full min-w-[880px] border-collapse text-sm">
                                    <thead>
                                        <tr
                                            className={
                                                darkMode
                                                    ? 'border-b border-orange-900/50 bg-[#262626]/85 text-left text-[11px] font-semibold uppercase tracking-wide text-orange-300/75'
                                                    : 'border-b border-orange-100 bg-orange-50/90 text-left text-[11px] font-semibold uppercase tracking-wide text-orange-900/75'
                                            }
                                        >
                                            <th className="p-3 pl-4">Imagen</th>
                                            <th className="p-3">Producto</th>
                                            <th className="p-3">Stock tienda</th>
                                            <th className="p-3">Cantidad</th>
                                            <th className="p-3">Precio unit.</th>
                                            <th className="p-3">Dto. línea %</th>
                                            <th className="p-3 pr-4 text-right">Subtotal</th>
                                            <th className="p-3 pr-4" />
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${darkMode ? 'divide-orange-900/35' : 'divide-orange-100'}`}>
                                        {lineas.map((l) => {
                                            const urls = l.imagenes_urls?.length ? l.imagenes_urls : l.imagen ? [l.imagen] : []
                                            const sub = lineSubtotal(l)
                                            const cellIn = darkMode
                                                ? 'rounded-xl border border-orange-800/50 bg-[#202020]/80 px-2 py-1.5 text-sm text-gray-100 outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/30'
                                                : 'rounded-xl border border-orange-100 bg-white px-2 py-1.5 text-sm text-gray-900 outline-none focus:border-orange-300 focus:ring-1 focus:ring-orange-200/80'
                                            return (
                                                <tr
                                                    key={l.clave}
                                                    className={darkMode ? 'transition-colors hover:bg-orange-950/30' : 'transition-colors hover:bg-orange-50/60'}
                                                >
                                                    <td className="p-3.5 pl-4 align-middle">
                                                        <ProductoImagenesCelda urls={urls} darkMode={darkMode} rowKey={l.clave} />
                                                    </td>
                                                    <td className="p-3.5 align-middle max-w-[14rem]">
                                                        <NombreProductoLink clave={l.clave} nombre={l.nombre_producto} darkMode={darkMode} />
                                                        <div className="mt-0.5 font-mono text-xs text-orange-800 dark:text-orange-200/90">{l.clave}</div>
                                                    </td>
                                                    <td className={`p-3.5 align-middle tabular-nums ${darkMode ? 'text-orange-200/70' : 'text-gray-600'}`}>
                                                        {l.stock_tienda != null ? l.stock_tienda : '—'}
                                                    </td>
                                                    <td className="p-3.5 align-middle">
                                                        <input
                                                            type="number"
                                                            min={1}
                                                            max={99999}
                                                            value={l.cantidad}
                                                            onChange={(e) => {
                                                                const v = Math.max(1, Math.min(99999, parseInt(e.target.value, 10) || 1))
                                                                setLineas((prev) => prev.map((x) => (x.clave === l.clave ? { ...x, cantidad: v } : x)))
                                                            }}
                                                            className={`w-20 tabular-nums ${cellIn}`}
                                                        />
                                                    </td>
                                                    <td className="p-3.5 align-middle">
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            step="0.01"
                                                            value={l.precio_unitario}
                                                            min={precioUnitarioMinimoPermitido(l, maxDescuentoPct)}
                                                            onChange={(e) => {
                                                                const raw = Math.max(0, parseFloat(e.target.value) || 0)
                                                                setLineas((prev) =>
                                                                    prev.map((x) => {
                                                                        if (x.clave !== l.clave) return x
                                                                        const next = { ...x, precio_unitario: raw }
                                                                        const minU = precioUnitarioMinimoPermitido(next, maxDescuentoPct)
                                                                        return { ...x, precio_unitario: Math.max(minU, raw) }
                                                                    })
                                                                )
                                                            }}
                                                            className={`w-28 tabular-nums ${cellIn}`}
                                                        />
                                                    </td>
                                                    <td className="p-3.5 align-middle">
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            max={100}
                                                            step="0.5"
                                                            value={l.descuento_linea_pct}
                                                            max={maxDescuentoLineaPct(l, maxDescuentoPct)}
                                                            onChange={(e) => {
                                                                const raw = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0))
                                                                setLineas((prev) =>
                                                                    prev.map((x) => {
                                                                        if (x.clave !== l.clave) return x
                                                                        const maxLp = maxDescuentoLineaPct(x, maxDescuentoPct)
                                                                        return { ...x, descuento_linea_pct: Math.min(maxLp, raw) }
                                                                    })
                                                                )
                                                            }}
                                                            className={`w-20 tabular-nums ${cellIn}`}
                                                        />
                                                    </td>
                                                    <td className="p-3.5 pr-4 align-middle text-right text-base font-semibold tabular-nums text-gray-900 dark:text-gray-50">
                                                        ${sub.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="p-3.5 pr-4 align-middle">
                                                        <button
                                                            type="button"
                                                            onClick={() => setLineas((prev) => prev.filter((x) => x.clave !== l.clave))}
                                                            className="rounded-full px-2.5 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/40"
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

                        <div className="grid gap-6 md:grid-cols-[1fr_min(16rem,100%)] md:items-stretch">
                            <div
                                className={`rounded-2xl border p-4 sm:p-5 ${
                                    darkMode ? 'border-orange-900/40 bg-[#202020]/40' : 'border-orange-100 bg-white/90'
                                }`}
                            >
                                <Label className={labelClass}>Descuento general (%)</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    max={100}
                                    step="0.5"
                                    value={descuentoGeneralPct}
                                    onChange={(e) => setDescuentoGeneralPct(e.target.value)}
                                    className={inputClass}
                                    placeholder="0"
                                />
                                <p className={`mt-2 text-xs ${darkMode ? 'text-orange-300/65' : 'text-orange-800/70'}`}>
                                    Máximo {maxDescuentoPct}% de descuento sobre el precio de catálogo (margen de venta).
                                </p>
                            </div>
                            <div
                                className={`flex flex-col justify-center rounded-2xl p-5 sm:p-6 text-white shadow-lg ${
                                    darkMode
                                        ? 'bg-gradient-to-br from-[#FF8000] via-[#cc6600] to-[#262626] shadow-black/40'
                                        : 'bg-gradient-to-br from-[#FF8000] to-[#e67300] shadow-orange-900/20'
                                }`}
                            >
                                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80">Total estimado</p>
                                <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums sm:text-[2rem]">
                                    ${totalCotizacion.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2">
                            <div
                                className={`space-y-4 rounded-2xl border p-4 sm:p-5 ${
                                    darkMode ? 'border-orange-900/40 bg-[#202020]/35' : 'border-orange-100 bg-white/90'
                                }`}
                            >
                                <p className={`text-sm font-semibold ${darkMode ? 'text-gray-100' : 'text-orange-950'}`}>Cliente en la tienda</p>
                                <Label className={labelClass}>Buscar por nombre o correo (opcional)</Label>
                                <Input
                                    value={clienteBusqueda}
                                    onChange={(e) => {
                                        setClienteBusqueda(e.target.value)
                                        setClienteSeleccionado(null)
                                    }}
                                    className={inputClass}
                                    placeholder="Escribe al menos 2 caracteres…"
                                />
                                {clienteOpciones.length > 0 && !clienteSeleccionado ? (
                                    <ul
                                        className={`max-h-44 overflow-y-auto rounded-xl border text-sm shadow-sm ${
                                            darkMode ? 'border-orange-800/50 bg-[#1c1c1c]/95' : 'border-orange-100 bg-white'
                                        }`}
                                    >
                                        {clienteOpciones.map((u) => (
                                            <li key={u.id}>
                                                <button
                                                    type="button"
                                                    className={`w-full px-3 py-2.5 text-left transition-colors hover:bg-orange-500/10 ${
                                                        darkMode ? 'text-gray-100' : 'text-gray-900'
                                                    }`}
                                                    onClick={() => {
                                                        setClienteSeleccionado(u)
                                                        setClienteBusqueda(`${u.name} · ${u.email}`)
                                                        setClienteOpciones([])
                                                    }}
                                                >
                                                    <span className="font-medium">{u.name}</span>
                                                    <span className={`mt-0.5 block text-xs ${darkMode ? 'text-orange-300/65' : 'text-gray-500'}`}>{u.email}</span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                ) : null}
                                {clienteSeleccionado ? (
                                    <p className={`rounded-xl px-3 py-2 text-xs ${darkMode ? 'bg-orange-950/60 text-orange-100' : 'bg-orange-50 text-orange-950'}`}>
                                        <span className="font-medium">{clienteSeleccionado.name}</span> ({clienteSeleccionado.email})
                                        <button
                                            type="button"
                                            className="ml-2 font-semibold underline decoration-orange-400/70 underline-offset-2"
                                            onClick={() => {
                                                setClienteSeleccionado(null)
                                                setClienteBusqueda('')
                                            }}
                                        >
                                            Quitar
                                        </button>
                                    </p>
                                ) : null}
                            </div>
                            <div
                                className={`space-y-4 rounded-2xl border p-4 sm:p-5 ${
                                    darkMode ? 'border-orange-900/40 bg-[#202020]/35' : 'border-orange-100 bg-white/90'
                                }`}
                            >
                                <p className={`text-sm font-semibold ${darkMode ? 'text-gray-100' : 'text-orange-950'}`}>Prospecto sin cuenta</p>
                                <div>
                                    <Label className={labelClass}>Nombre</Label>
                                    <Input value={invitadoNombre} onChange={(e) => setInvitadoNombre(e.target.value)} className={inputClass} />
                                </div>
                                <div>
                                    <Label className={labelClass}>Correo</Label>
                                    <Input value={invitadoEmail} onChange={(e) => setInvitadoEmail(e.target.value)} className={inputClass} type="email" />
                                </div>
                                <div>
                                    <Label className={labelClass}>Teléfono</Label>
                                    <Input value={invitadoTelefono} onChange={(e) => setInvitadoTelefono(e.target.value)} className={inputClass} />
                                </div>
                            </div>
                        </div>

                        <div
                            className={`rounded-2xl border p-4 sm:p-5 ${darkMode ? 'border-orange-900/40 bg-[#202020]/30' : 'border-orange-100 bg-orange-50/40'}`}
                        >
                            <Label className={labelClass}>Comentario interno (opcional)</Label>
                            <textarea
                                value={comentario}
                                onChange={(e) => setComentario(e.target.value)}
                                rows={3}
                                className={inputClass}
                                placeholder="Notas para el equipo…"
                            />
                        </div>

                        <div className="flex flex-wrap gap-3 pt-1">
                            <button
                                type="button"
                                onClick={handleGuardar}
                                disabled={saving}
                                className="inline-flex min-w-[10rem] items-center justify-center rounded-full bg-gradient-to-r from-[#FF8000] to-[#e67300] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-900/25 transition hover:brightness-105 disabled:opacity-45"
                            >
                                {saving ? 'Guardando…' : editingId ? 'Actualizar cotización' : 'Guardar cotización'}
                            </button>
                            {editingId ? (
                                <button
                                    type="button"
                                    onClick={resetFormulario}
                                    className={`inline-flex items-center justify-center rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors ${
                                        darkMode
                                            ? 'border-orange-700/50 text-orange-100 hover:bg-orange-950/50'
                                            : 'border-orange-200 text-orange-950 hover:bg-orange-50'
                                    }`}
                                >
                                    Cancelar edición
                                </button>
                            ) : null}
                        </div>
                    </div>
                </div>
            </div>
            )}

            {mainTab === 'guardadas' && (
            <div className={card}>
                <div
                    className={`border-b px-6 py-5 sm:px-8 ${
                        darkMode ? 'border-orange-900/40 bg-[#262626]/80' : 'border-orange-100 bg-orange-50/70'
                    }`}
                >
                    <h2 className={`text-lg font-semibold tracking-tight sm:text-xl ${darkMode ? 'text-gray-100' : 'text-orange-950'}`}>
                        Cotizaciones guardadas
                    </h2>
                </div>
                <div className="space-y-5 p-5 sm:p-8">
                    {loadingSaved ? (
                        <div className={`flex items-center gap-3 py-10 text-sm ${darkMode ? 'text-orange-200/70' : 'text-orange-800/75'}`}>
                            <span className="h-5 w-5 animate-spin rounded-full border-2 border-orange-400/30 border-t-orange-500" />
                            Cargando…
                        </div>
                    ) : savedRows.length === 0 ? (
                        <p
                            className={`rounded-2xl border px-4 py-10 text-center text-sm ${darkMode ? 'border-orange-900/40 text-orange-300/70' : 'border-orange-100 bg-orange-50/50 text-orange-900/75'}`}
                        >
                            Sin cotizaciones guardadas.
                        </p>
                    ) : (
                        <>
                            <div className={`overflow-x-auto rounded-2xl border ${darkMode ? 'border-orange-900/40' : 'border-orange-100'}`}>
                                <table className="w-full min-w-[800px] text-sm">
                                    <thead>
                                        <tr
                                            className={
                                                darkMode
                                                    ? 'border-b border-orange-900/50 bg-[#262626]/85 text-left text-[11px] font-semibold uppercase tracking-wide text-orange-300/75'
                                                    : 'border-b border-orange-100 bg-orange-50/90 text-left text-[11px] font-semibold uppercase tracking-wide text-orange-900/75'
                                            }
                                        >
                                            <th className="p-3.5 pl-5">Folio</th>
                                            <th className="p-3.5 min-w-[14rem]">Cliente / destino</th>
                                            <th className="p-3.5 text-right">Total</th>
                                            <th className="p-3.5">Creada</th>
                                            <th className="p-3.5">Actualizada</th>
                                            <th className="p-3.5 pr-5 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${darkMode ? 'divide-orange-900/35' : 'divide-orange-100'}`}>
                                        {savedRows.map((row) => (
                                            <tr
                                                key={row.id}
                                                className={darkMode ? 'transition-colors hover:bg-orange-950/30' : 'transition-colors hover:bg-orange-50/70'}
                                            >
                                                <td className="p-3.5 pl-5 whitespace-nowrap">
                                                    <span className="inline-flex rounded-full bg-orange-500/15 px-2.5 py-1 font-mono text-xs font-semibold text-orange-900 ring-1 ring-orange-200/70 dark:bg-orange-400/10 dark:text-orange-100 dark:ring-orange-400/30">
                                                        {row.folio || `—`}
                                                    </span>
                                                </td>
                                                <td className="p-3.5 max-w-[20rem]">
                                                    <div className={`line-clamp-3 text-sm ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                                                        {row.cliente_destino || nombreClienteMostrar(row)}
                                                    </div>
                                                    {row.comentario ? (
                                                        <div
                                                            className={`mt-1 line-clamp-1 text-xs ${darkMode ? 'text-orange-300/55' : 'text-gray-500'}`}
                                                            title={row.comentario}
                                                        >
                                                            {row.comentario}
                                                        </div>
                                                    ) : null}
                                                </td>
                                                <td className="p-3.5 text-right text-base font-semibold tabular-nums text-gray-900 dark:text-gray-50">
                                                    ${Number(row.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className={`p-3.5 whitespace-nowrap text-xs ${darkMode ? 'text-orange-200/65' : 'text-gray-600'}`}>{fmtFecha(row.created_at)}</td>
                                                <td className={`p-3.5 whitespace-nowrap text-xs ${darkMode ? 'text-orange-200/65' : 'text-gray-600'}`}>{fmtFecha(row.updated_at)}</td>
                                                <td className="p-3.5 pr-5 text-right">
                                                    <div className="inline-flex flex-wrap justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handlePdf(row)}
                                                            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                                                                darkMode
                                                                    ? 'border-orange-600/50 bg-orange-950/50 text-orange-100 hover:bg-orange-900/50'
                                                                    : 'border-orange-200 bg-orange-50 text-orange-900 hover:bg-orange-100'
                                                            }`}
                                                        >
                                                            PDF
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => cargarParaEditar(row)}
                                                            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                                                                darkMode
                                                                    ? 'border-orange-500/40 bg-orange-600/20 text-orange-100 hover:bg-orange-600/35'
                                                                    : 'border-orange-200 bg-white text-orange-900 hover:bg-orange-50'
                                                            }`}
                                                        >
                                                            Editar
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleEliminar(row.id)}
                                                            className="rounded-full border border-transparent px-3 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/40"
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
                            <VentasPaginationPink
                                current={savedMeta.current_page || 1}
                                lastPage={savedMeta.last_page || 1}
                                onPageChange={(p) => loadSaved(p)}
                                darkMode={darkMode}
                            />
                        </>
                    )}
                </div>
            </div>
            )}
        </div>
    )
}
