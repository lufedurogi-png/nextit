import { celdaCantidadConLetra, celdaMontoConLetra, montoALetrasMx } from '@/lib/numeroALetras'

/**
 * Genera y descarga un PDF de cotización con el mismo formato que en el dashboard.
 * @param {Array<{ nombre_producto?: string, clave?: string, cantidad?: number, precio_unitario?: number, subtotal?: number }>} items
 * @param {number} total
 * @param {string} [nombreArchivo] - Ej: Cotizacion_2025-01-29_14-30.pdf
 * @param {string|number} [cotizacionId] - Folio o ID de cotización (opcional). Se usa en el pie del PDF.
 */
export async function downloadCotizacionPdf(items, total, nombreArchivo, cotizacionId) {
    const fechaStr = new Date().toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
    const file = nombreArchivo || `Cotizacion_${new Date().toISOString().slice(0, 16).replace('T', '_')}.pdf`
    const totalStr = typeof total === 'number' ? total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : String(total)

    const { jsPDF } = await import('jspdf')
    const autoTable = (await import('jspdf-autotable')).default
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const margin = 14

    const loadImageDataUrl = (src) => new Promise((resolve) => {
        try {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas')
                    canvas.width = img.naturalWidth || img.width
                    canvas.height = img.naturalHeight || img.height
                    const ctx = canvas.getContext('2d')
                    if (!ctx) return resolve(null)
                    ctx.drawImage(img, 0, 0)
                    resolve(canvas.toDataURL('image/png'))
                } catch {
                    resolve(null)
                }
            }
            img.onerror = () => resolve(null)
            img.src = src
        } catch {
            resolve(null)
        }
    })

    const bgData = (await loadImageDataUrl('/Imagenes/Hoja_membretada.png'))
        || (await loadImageDataUrl('/Imagenes/Hoja_membretada.jpg'))
    if (bgData) {
        doc.addImage(bgData, 'PNG', 0, 0, pageW, pageH)
    }

    // Paleta alineada con PDF de pedidos (DomPDF pedido.blade.php): naranjas CVA / marca
    const orange = [234, 88, 12]
    const orangeLight = [255, 247, 237]
    const orangeDark = [194, 65, 12]
    const orangeBorderSoft = [255, 237, 213]

    // Evita tapar el logo del membrete superior
    doc.setTextColor(...orangeDark)
    doc.setFontSize(11)
    doc.setFont(undefined, 'bold')
    doc.text('COTIZACIÓN', margin, 34)
    doc.setFontSize(14)
    doc.text(`Fecha: ${fechaStr}`, pageW - margin, 34, { align: 'right' })

    doc.setTextColor(...orangeDark)
    doc.setFontSize(11)
    doc.setFont(undefined, 'normal')

    doc.setDrawColor(...orange)
    doc.setLineWidth(0.8)
    doc.line(margin, 50, pageW - margin, 50)

    doc.setFillColor(...orangeLight)
    doc.rect(margin, 54, pageW - margin * 2, 8, 'F')
    doc.setTextColor(...orangeDark)
    doc.setFontSize(10)
    doc.setFont(undefined, 'bold')
    doc.text('DETALLE DE LA COTIZACIÓN', margin + 4, 59.5)
    doc.setTextColor(0, 0, 0)

    const tableData = (items || []).map((i) => {
        const nombre = (i.nombre_producto || i.clave || '').toString().slice(0, 55) + (i.clave ? ` (${i.clave})` : '')
        const pUnit = typeof i.precio_unitario === 'number' ? '$ ' + i.precio_unitario.toLocaleString('es-MX', { minimumFractionDigits: 2 }) : (i.precio_unitario ?? '-')
        const sub = typeof i.subtotal === 'number' ? '$ ' + i.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 }) : (i.subtotal ?? '-')
        return [nombre, String(i.cantidad ?? 1), pUnit, sub]
    })

    autoTable(doc, {
        startY: 64,
        head: [['Producto', 'Cant.', 'P. unit.', 'Subtotal']],
        body: tableData,
        theme: 'plain',
        headStyles: {
            fillColor: orangeLight,
            textColor: orangeDark,
            fontStyle: 'bold',
            fontSize: 9
        },
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { halign: 'right', cellWidth: 18 },
            2: { halign: 'right', cellWidth: 28 },
            3: { halign: 'right', cellWidth: 28 }
        },
        margin: { left: margin, right: margin },
        tableLineColor: orangeBorderSoft,
        tableLineWidth: 0.3
    })

    const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 14 : 90
    doc.setDrawColor(...orange)
    doc.setLineWidth(0.6)
    doc.line(margin, finalY, pageW - margin, finalY)
    doc.setFontSize(11)
    doc.setFont(undefined, 'bold')
    doc.setTextColor(...orangeDark)
    doc.text('Total', margin, finalY + 5)
    doc.setFontSize(14)
    doc.setTextColor(...orange)
    doc.text(`$ ${totalStr}`, pageW - margin, finalY + 5, { align: 'right' })
    const totalNum = typeof total === 'number' ? total : Number(total)
    let leyendaY = finalY + 5
    if (Number.isFinite(totalNum)) {
        doc.setFontSize(8)
        doc.setTextColor(80, 80, 80)
        doc.text(`(${montoALetrasMx(totalNum)})`, pageW - margin, finalY + 10, { align: 'right' })
        leyendaY = finalY + 10
        doc.setTextColor(0, 0, 0)
    }

    // Leyenda de IVA debajo del total
    const ivaY = leyendaY + 5
    doc.setFontSize(9)
    doc.setFont(undefined, 'italic')
    doc.setTextColor(107, 114, 128)
    doc.text('Los precios no incluyen IVA', pageW - margin, ivaY, { align: 'right' })
    doc.setFont(undefined, 'normal')

    // Pie justo después del total
    const folio = cotizacionId != null && cotizacionId !== '' ? String(cotizacionId) : ''
    const footerY = ivaY + 9
    doc.setDrawColor(...orange)
    doc.setLineWidth(0.4)
    doc.line(margin, footerY - 6, pageW - margin, footerY - 6)
    doc.setFontSize(9)
    doc.setFont(undefined, 'normal')
    doc.setTextColor(156, 163, 175)
    const footerTxt = folio
        ? `Cotización ${folio} · Documento generado por Todo para oficina · ${fechaStr}`
        : `Cotización · Documento generado por Todo para oficina · ${fechaStr}`
    doc.text(footerTxt, pageW / 2, footerY, { align: 'center' })

    doc.save(file)
}
