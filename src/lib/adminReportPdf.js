/**
 * Informes PDF de admin-home con fondo membretado.
 */

const margin = 14
const green = [5, 150, 105]
const greenLight = [236, 253, 245]
const greenDark = [4, 120, 87]
const grayText = [55, 65, 81]
let bgImagePromise = null

async function loadBackgroundImageDataUrl() {
    if (!bgImagePromise) {
        bgImagePromise = fetch('/Imagenes/Hoja_membretada.png')
            .then((res) => {
                if (!res.ok) throw new Error('No se pudo cargar el fondo PDF')
                return res.blob()
            })
            .then((blob) => new Promise((resolve, reject) => {
                const reader = new FileReader()
                reader.onload = () => resolve(reader.result)
                reader.onerror = reject
                reader.readAsDataURL(blob)
            }))
            .catch(() => null)
    }
    return bgImagePromise
}

function drawHeaderFooter(doc, titulo, subtitulo) {
    const pageW = doc.internal.pageSize.getWidth()
    const fechaStr = new Date().toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })

    doc.setTextColor(...greenDark)
    doc.setFontSize(14)
    doc.setFont(undefined, 'bold')
    // Dejamos libre el área del logo de la hoja membretada.
    doc.text('NXT.IT - Reporte estadístico', margin, 40)
    doc.setFontSize(10.5)
    doc.text(titulo, margin, 46)
    doc.setFont(undefined, 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...grayText)
    doc.text(`Generado: ${fechaStr}`, margin, 51)
    doc.text(`Sección: ${subtitulo}`, margin, 55)

    doc.setDrawColor(...green)
    doc.setLineWidth(0.6)
    doc.line(margin, 59, pageW - margin, 59)
}

function reportTableOptions(doc, titulo, subtitulo, bgDataUrl) {
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()

    return {
        startY: 64,
        margin: { top: 64, bottom: 55, left: margin, right: margin },
        theme: 'grid',
        styles: {
            fontSize: 9,
            textColor: [31, 41, 55],
            lineColor: [167, 243, 208],
            lineWidth: 0.2,
            fillColor: [255, 255, 255],
        },
        headStyles: {
            fillColor: greenLight,
            textColor: greenDark,
            fontStyle: 'bold',
            lineColor: [110, 231, 183],
        },
        willDrawPage: () => {
            if (bgDataUrl) {
                doc.addImage(bgDataUrl, 'PNG', 0, 0, pageW, pageH)
            }
            drawHeaderFooter(doc, titulo, subtitulo)
        },
    }
}

/**
 * PDF: Informe de categorías más vistas en búsquedas.
 * @param {Array<{ nombre?: string, total?: number }>} categorias
 */
export async function downloadInformeCategorias(categorias) {
    const { jsPDF } = await import('jspdf')
    const autoTable = (await import('jspdf-autotable')).default
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const bg = await loadBackgroundImageDataUrl()

    const tableData = (categorias || []).map((c) => [
        (c.nombre || 'Sin categoría').toString().slice(0, 60),
        String(c.total ?? 0),
    ])

    autoTable(doc, {
        ...reportTableOptions(doc, 'INFORME · CATEGORÍAS MÁS VISTAS', 'Categorías más vistas en búsquedas', bg),
        head: [['Categoría', 'Total búsquedas']],
        body: tableData.length ? tableData : [['Sin datos', '-']],
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { halign: 'right', cellWidth: 35 },
        },
    })

    doc.save(`Informe_Categorias_${new Date().toISOString().slice(0, 10)}.pdf`)
}

const TIPO_LABELS = { 1: 'Admin', 2: 'Cliente', 3: 'Vendedor' }

/**
 * PDF: Informe de actividad de usuarios (por mes o por eventos día/hora).
 * @param {Array<{ mes: string, registros: number, logins: number }>} actividadData
 * @param {Array<{ dia: number, hora: number, tipo: number, evento: string }>} eventos
 */
export async function downloadInformeActividad(actividadData, eventos) {
    const { jsPDF } = await import('jspdf')
    const autoTable = (await import('jspdf-autotable')).default
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const bg = await loadBackgroundImageDataUrl()
    let y = 64

    if (eventos && eventos.length > 0) {
        const hora12 = (h) => {
            if (h === 0) return '12:00 am'
            if (h === 12) return '12:00 pm'
            return h < 12 ? `${h}:00 am` : `${h - 12}:00 pm`
        }
        const tableData = eventos
            .slice(0, 80)
            .map((e) => [
                String(e.dia),
                hora12(Number(e.hora)),
                TIPO_LABELS[e.tipo] || 'Usuario',
                e.evento === 'registro' ? 'Registro' : 'Inicio de sesión',
            ])

        autoTable(doc, {
            ...reportTableOptions(doc, 'INFORME · ACTIVIDAD DE USUARIOS', 'Actividad de usuarios', bg),
            startY: y,
            head: [['Día', 'Hora', 'Tipo', 'Evento']],
            body: tableData,
        })
        y = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : y + 30
    }

    if (actividadData && actividadData.length > 0) {
        const tableData = actividadData.map((r) => [
            String(r.mes || '-'),
            String(r.registros ?? 0),
            String(r.logins ?? 0),
        ])

        autoTable(doc, {
            ...reportTableOptions(doc, 'INFORME · ACTIVIDAD DE USUARIOS', 'Actividad de usuarios', bg),
            startY: y,
            head: [['Mes', 'Registros', 'Inicios de sesión']],
            body: tableData,
            columnStyles: {
                1: { halign: 'right' },
                2: { halign: 'right' },
            },
        })
    }

    doc.save(`Informe_Actividad_${new Date().toISOString().slice(0, 10)}.pdf`)
}

/**
 * PDF: Productos por categoría (catálogo).
 * @param {Array<{ nombre?: string, total?: number }>} categorias
 */
export async function downloadInformeProductosPorCategoria(categorias) {
    const { jsPDF } = await import('jspdf')
    const autoTable = (await import('jspdf-autotable')).default
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const bg = await loadBackgroundImageDataUrl()

    const tableData = (categorias || []).map((c) => [
        String(c.nombre || 'Sin categoría'),
        String(Number(c.total) || 0),
    ])

    autoTable(doc, {
        ...reportTableOptions(doc, 'INFORME · PRODUCTOS POR CATEGORÍA', 'Estadísticas de catálogo', bg),
        head: [['Categoría', 'Productos']],
        body: tableData.length ? tableData : [['Sin datos', '-']],
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { halign: 'right', cellWidth: 35 },
        },
    })

    doc.save(`Informe_Productos_Por_Categoria_${new Date().toISOString().slice(0, 10)}.pdf`)
}

/**
 * PDF: Productos por marca (catálogo).
 * @param {Array<{ nombre?: string, total?: number }>} marcas
 */
export async function downloadInformeProductosPorMarca(marcas) {
    const { jsPDF } = await import('jspdf')
    const autoTable = (await import('jspdf-autotable')).default
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const bg = await loadBackgroundImageDataUrl()

    const tableData = (marcas || []).map((m) => [
        String(m.nombre || 'Sin marca'),
        String(Number(m.total) || 0),
    ])

    autoTable(doc, {
        ...reportTableOptions(doc, 'INFORME · PRODUCTOS POR MARCA', 'Estadísticas de catálogo', bg),
        head: [['Marca', 'Productos']],
        body: tableData.length ? tableData : [['Sin datos', '-']],
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { halign: 'right', cellWidth: 35 },
        },
    })

    doc.save(`Informe_Productos_Por_Marca_${new Date().toISOString().slice(0, 10)}.pdf`)
}
