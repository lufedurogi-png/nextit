/**
 * Informe de usuarios (.xlsx) en el navegador con ExcelJS.
 * Cabecera superior verde (marca); bloque de sección y datos en gris/blanco con bordes negros.
 */

const COL = {
    emerald900: 'FF064E3B',
    emerald800: 'FF065F46',
    emerald700: 'FF047857',
    emerald600: 'FF059669',
    emerald100: 'FFD1FAE5',
    emerald50: 'FFECFDF5',
    white: 'FFFFFFFF',
    black: 'FF000000',
    gray900: 'FF111827',
    gray700: 'FF374151',
    gray600: 'FF4B5563',
    gray300: 'FFD1D5DB',
    gray200: 'FFE5E7EB',
    gray100: 'FFF3F4F6',
    gray50: 'FFF9FAFB',
    borderMuted: 'FFD1D5DB',
}

const HEADERS = ['Nombre', 'Email', 'Rol(es)', 'Permisos']

const SHEETS = [
    { key: 'admin', name: 'Administradores' },
    { key: 'customer', name: 'Clientes' },
    { key: 'seller', name: 'Vendedores' },
]

function tipoToRoleKey(u) {
    const fromRoles = u.roles?.[0]
    if (fromRoles) {
        const r = String(fromRoles).toLowerCase()
        if (r === 'admin' || r === 'customer' || r === 'seller') return r
    }
    const tipoNum = typeof u.tipo === 'object' && u.tipo?.value != null ? u.tipo.value : Number(u.tipo)
    return { 1: 'admin', 2: 'customer', 3: 'seller' }[tipoNum] || 'customer'
}

function rolePretty(r) {
    const k = String(r || '').toLowerCase()
    return { admin: 'Admin', customer: 'Cliente', seller: 'Vendedor' }[k] || r
}

function rolesDisplay(u) {
    if (u.roles?.length) return u.roles.map(rolePretty).join(', ')
    const map = { admin: 'Admin', customer: 'Cliente', seller: 'Vendedor' }
    return map[tipoToRoleKey(u)] || '—'
}

function permisosDisplay(u, labelByValue) {
    const list = u.permissions || []
    if (!list.length) return '—'
    return list.map((p) => labelByValue[p] || p).join(', ')
}

function filenameInformeUsuariosXlsx() {
    const d = new Date()
    const p = (n) => String(n).padStart(2, '0')
    return `Informe_usuarios_${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}.xlsx`
}

function arrayBufferToBase64(buffer) {
    let binary = ''
    const bytes = new Uint8Array(buffer)
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
    return btoa(binary)
}

async function loadLogoBase64() {
    try {
        const res = await fetch('/Imagenes/logo_nxtIt.png')
        if (!res.ok) return null
        const buf = await res.arrayBuffer()
        return arrayBufferToBase64(buf)
    } catch {
        return null
    }
}

function thinBorder(colorArgb = COL.borderMuted) {
    const b = { style: 'thin', color: { argb: colorArgb } }
    return { top: b, left: b, bottom: b, right: b }
}

/** Bordes negros finos (tabla clásica). */
function blackTableBorder() {
    const b = { style: 'thin', color: { argb: COL.black } }
    return { top: b, left: b, bottom: b, right: b }
}

function fillCell(cell, argb) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } }
}

/**
 * Cabecera: logo a la izquierda (columna A), textos en B–D.
 */
function drawSheetBanner(workbook, worksheet, logoBase64, startRow) {
    const r = startRow

    worksheet.mergeCells(r, 2, r, 4)
    const titleCell = worksheet.getCell(r, 2)
    titleCell.value = 'Informe de usuarios'
    titleCell.font = { bold: true, size: 17, color: { argb: COL.emerald900 } }
    titleCell.alignment = { vertical: 'middle', horizontal: 'left' }
    titleCell.border = thinBorder(COL.emerald100)
    fillCell(titleCell, COL.emerald50)
    fillCell(worksheet.getCell(r, 1), COL.emerald50)
    worksheet.getRow(r).height = 28

    const r2 = r + 1
    worksheet.mergeCells(r2, 2, r2, 4)
    const sub = worksheet.getCell(r2, 2)
    sub.value = 'NXT.IT · Todo para oficina · Panel de administración'
    sub.font = { size: 11, color: { argb: COL.emerald700 }, italic: true }
    sub.alignment = { vertical: 'middle', horizontal: 'left' }
    sub.border = thinBorder(COL.emerald100)
    fillCell(sub, COL.emerald50)
    fillCell(worksheet.getCell(r2, 1), COL.emerald50)
    worksheet.getRow(r2).height = 22

    const r3 = r + 2
    worksheet.mergeCells(r3, 2, r3, 4)
    const fecha = worksheet.getCell(r3, 2)
    fecha.value = `Generado: ${new Date().toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'medium' })}`
    fecha.font = { size: 10, color: { argb: COL.gray600 } }
    fecha.alignment = { vertical: 'middle', horizontal: 'left' }
    fecha.border = thinBorder(COL.emerald100)
    fillCell(fecha, COL.white)
    fillCell(worksheet.getCell(r3, 1), COL.white)
    worksheet.getRow(r3).height = 20

    if (logoBase64) {
        try {
            const imageId = workbook.addImage({
                base64: logoBase64,
                extension: 'png',
            })
            worksheet.addImage(imageId, {
                tl: { col: 0.12, row: r - 1 + 0.06 },
                ext: { width: 132, height: 44 },
            })
        } catch {
            /* ignore */
        }
    }

    return r + 4
}

/**
 * @param {Array<object>} users
 * @param {Array<{ value: string, label: string }>} permissionsCatalog
 */
export async function downloadInformeUsuariosXlsx(users, permissionsCatalog = []) {
    const { Workbook } = await import('exceljs')
    const labelByValue = Object.fromEntries((permissionsCatalog || []).map((x) => [x.value, x.label]))

    const buckets = { admin: [], customer: [], seller: [] }
    for (const u of users || []) {
        const k = tipoToRoleKey(u)
        if (buckets[k]) buckets[k].push(u)
        else buckets.customer.push(u)
    }

    const logoBase64 = await loadLogoBase64()
    const workbook = new Workbook()
    workbook.creator = 'NXT.IT'
    workbook.created = new Date()
    workbook.modified = new Date()
    workbook.title = 'Informe de usuarios'

    const colWidths = [{ width: 18 }, { width: 28 }, { width: 32 }, { width: 50 }]
    const COL_COUNT = 4

    let anySheet = false

    for (const { key, name } of SHEETS) {
        const list = buckets[key]
        if (!list.length) continue
        anySheet = true

        const sheetName = name.length > 31 ? name.slice(0, 31) : name
        const ws = workbook.addWorksheet(sheetName, {
            properties: { tabColor: { argb: COL.gray300 } },
            views: [{ showGridLines: false }],
        })
        ws.columns = colWidths

        let rowPtr = drawSheetBanner(workbook, ws, logoBase64, 1)

        ws.mergeCells(rowPtr, 1, rowPtr, COL_COUNT)
        const sectionCell = ws.getCell(rowPtr, 1)
        sectionCell.value = `${name} · ${list.length} usuario${list.length === 1 ? '' : 's'}`
        sectionCell.font = { bold: true, size: 12, color: { argb: COL.gray900 } }
        sectionCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COL.gray100 } }
        sectionCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
        sectionCell.border = blackTableBorder()
        ws.getRow(rowPtr).height = 24
        rowPtr += 1

        rowPtr += 1

        const tableTop = rowPtr
        const tableRows = list.map((u) => [
            String(u.name || '—'),
            String(u.email || '—'),
            rolesDisplay(u),
            permisosDisplay(u, labelByValue),
        ])

        const headerRow = ws.getRow(tableTop)
        HEADERS.forEach((text, i) => {
            const cell = headerRow.getCell(i + 1)
            cell.value = text
            cell.font = { bold: true, size: 11, color: { argb: COL.gray900 } }
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COL.gray200 } }
            cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }
            cell.border = blackTableBorder()
        })
        headerRow.height = 22

        tableRows.forEach((vals, idx) => {
            const r = tableTop + 1 + idx
            const row = ws.getRow(r)
            const stripe = idx % 2 === 0 ? COL.white : COL.gray50
            vals.forEach((val, i) => {
                const cell = row.getCell(i + 1)
                cell.value = val
                cell.font = { size: 10, color: { argb: COL.gray700 } }
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: stripe } }
                cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true }
                cell.border = blackTableBorder()
            })
            const permLen = String(vals[3] || '').length
            row.height = Math.min(100, Math.max(16, 12 + Math.ceil(permLen / 48) * 11))
        })

        ws.autoFilter = {
            from: { row: tableTop, column: 1 },
            to: { row: tableTop + list.length, column: COL_COUNT },
        }

        rowPtr = tableTop + list.length + 2
    }

    if (!anySheet) {
        const ws = workbook.addWorksheet('Informe', {
            properties: { tabColor: { argb: COL.gray200 } },
            views: [{ showGridLines: false }],
        })
        ws.columns = colWidths
        let rowPtr = drawSheetBanner(workbook, ws, logoBase64, 1)
        ws.mergeCells(rowPtr, 1, rowPtr, 4)
        const emptyCell = ws.getCell(rowPtr, 1)
        emptyCell.value = 'No hay usuarios en el listado actual. Ajusta los filtros e intenta de nuevo.'
        emptyCell.font = { size: 11, color: { argb: COL.gray600 }, italic: true }
        emptyCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 }
        emptyCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COL.gray50 } }
        emptyCell.border = blackTableBorder()
        ws.getRow(rowPtr).height = 36
    }

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filenameInformeUsuariosXlsx()
    a.click()
    URL.revokeObjectURL(url)
}
