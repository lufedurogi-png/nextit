import { bestFuzzyScore } from '@/lib/ventasSearchFuzzy'

/** Índice estático de vistas y palabras clave del módulo Ventas. */
export const VENTAS_SEARCH_VIEWS = [
    {
        id: 'vista-dashboard',
        vista: 'Resumen',
        title: 'Dashboard comercial',
        subtitle: 'Indicadores, embudo y accesos rápidos',
        href: '/ventas-dashboard',
        keywords: ['resumen', 'dashboard', 'inicio', 'kpi', 'indicadores', 'panel', 'principal'],
    },
    {
        id: 'vista-pipeline',
        vista: 'Pipeline',
        title: 'Pipeline comercial',
        subtitle: 'Oportunidades por etapa del embudo',
        href: '/ventas-pipeline',
        keywords: ['pipeline', 'embudo', 'oportunidad', 'etapa', 'negociacion', 'ganado', 'perdido', 'seguimiento'],
    },
    {
        id: 'vista-tareas',
        vista: 'Pendientes',
        title: 'Lista de pendientes',
        subtitle: 'Tareas operativas del vendedor',
        href: '/ventas-tareas',
        keywords: ['pendientes', 'tareas', 'lista', 'hacer', 'to do', 'actividades'],
    },
    {
        id: 'vista-calendario',
        vista: 'Calendario',
        title: 'Calendario de ventas',
        subtitle: 'Agenda y recordatorios',
        href: '/ventas-calendario',
        keywords: ['calendario', 'agenda', 'cita', 'fecha', 'recordatorio', 'semana'],
    },
    {
        id: 'vista-inbox',
        vista: 'Bandeja',
        title: 'Bandeja de mensajes',
        subtitle: 'Chat con clientes',
        href: '/ventas-inbox',
        keywords: ['bandeja', 'inbox', 'chat', 'mensaje', 'mensajes', 'conversacion', 'whatsapp'],
    },
    {
        id: 'vista-clientes',
        vista: 'Clientes',
        title: 'Clientes y cotizaciones',
        subtitle: 'CRM y cotizaciones de tienda',
        href: '/ventas-clientes',
        keywords: ['clientes', 'cliente', 'crm', 'historial', 'prospecto', 'contacto'],
    },
    {
        id: 'vista-cotizaciones',
        vista: 'Cotizaciones',
        title: 'Cotizaciones de ventas',
        subtitle: 'Crear y editar cotizaciones',
        href: '/ventas-cotizaciones',
        keywords: ['cotizacion', 'cotizaciones', 'presupuesto', 'oferta', 'cv', 'folio'],
    },
    {
        id: 'vista-correos',
        vista: 'Correos',
        title: 'Envío de correos',
        subtitle: 'Campañas y destinatarios',
        href: '/ventas-correos',
        keywords: ['correo', 'correos', 'email', 'mail', 'enviar', 'campana'],
    },
    {
        id: 'vista-correos-historial',
        vista: 'Historial correos',
        title: 'Historial de correos enviados',
        subtitle: 'Registro de envíos',
        href: '/ventas-correos-historial',
        keywords: ['historial', 'correos enviados', 'registro email'],
    },
    {
        id: 'vista-pedidos',
        vista: 'Pedidos',
        title: 'Pedidos',
        subtitle: 'Seguimiento de pedidos',
        href: '/ventas-pedidos',
        keywords: ['pedido', 'pedidos', 'orden', 'compra', 'folio pedido', 'envio'],
    },
    {
        id: 'vista-reportes',
        vista: 'Reportes',
        title: 'Reportes comerciales',
        subtitle: 'KPIs y exportación',
        href: '/ventas-reportes',
        keywords: ['reporte', 'reportes', 'estadistica', 'metrica', 'csv', 'analisis'],
    },
    {
        id: 'vista-catalogo',
        vista: 'Catálogo',
        title: 'Catálogo de productos',
        subtitle: 'Buscar productos para cotizar',
        href: '/ventas-catalogo',
        keywords: ['catalogo', 'producto', 'productos', 'stock', 'precio', 'articulo'],
    },
    {
        id: 'vista-margen-venta',
        vista: 'Margen venta',
        title: 'Margen de venta',
        subtitle: 'Porcentaje global sobre precios de catálogo',
        href: '/ventas-margen-venta',
        keywords: ['margen', 'porcentaje', 'precio', 'descuento maximo', 'ganancia'],
    },
    {
        id: 'vista-cotizaciones-invitado',
        vista: 'Cotiz. invitados',
        title: 'Cotizaciones de invitados',
        subtitle: 'Consultar cotizaciones hechas sin cuenta',
        href: '/ventas-cotizaciones-invitado',
        keywords: ['cotizacion invitado', 'invitados', 'guest', 'folio', 'pdf'],
    },
    {
        id: 'vista-publicidad',
        vista: 'Publicidad',
        title: 'Publicidad y promociones',
        subtitle: 'Carrusel de tienda y promociones',
        href: '/ventas-publicidad',
        keywords: ['publicidad', 'promocion', 'promociones', 'carrusel', 'banner'],
    },
    {
        id: 'vista-productos-manuales',
        vista: 'Productos manuales',
        title: 'Productos manuales',
        subtitle: 'Alta y edición de productos propios',
        href: '/ventas-productos-manuales',
        keywords: ['productos manuales', 'manual', 'alta producto', 'inventario propio'],
    },
]

export function searchVentasViews(query, threshold) {
    return VENTAS_SEARCH_VIEWS.map((entry) => {
        const blob = [entry.title, entry.subtitle, entry.vista, ...(entry.keywords || [])].join(' ')
        const score = bestFuzzyScore(query, blob, threshold)
        return score > 0 ? { ...entry, type: 'vista', score } : null
    })
        .filter(Boolean)
        .sort((a, b) => b.score - a.score)
}
