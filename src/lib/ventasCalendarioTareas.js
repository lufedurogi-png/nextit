/** Utilidades de fechas y filtros para el calendario de ventas (datos desde API). */

/** Lunes = inicio de semana (México / ISO común en negocio). */
export function startOfWeekMonday(d) {
    const x = new Date(d)
    x.setHours(0, 0, 0, 0)
    const dow = x.getDay() // 0 Dom … 6 Sáb
    const diff = dow === 0 ? -6 : 1 - dow
    x.setDate(x.getDate() + diff)
    return x
}

export function addDays(d, n) {
    const x = new Date(d)
    x.setDate(x.getDate() + n)
    return x
}

export function toISODate(d) {
    const x = new Date(d)
    x.setHours(0, 0, 0, 0)
    const y = x.getFullYear()
    const m = String(x.getMonth() + 1).padStart(2, '0')
    const day = String(x.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
}

/** Primer celda del grid del mes (puede ser día del mes anterior). */
export function calendarMonthGrid(visibleMonth) {
    const first = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1)
    first.setHours(0, 0, 0, 0)
    const dow = first.getDay()
    const pad = dow === 0 ? 6 : dow - 1 // Lunes=0 en grid
    const start = addDays(first, -pad)
    const cells = []
    for (let i = 0; i < 42; i++) {
        cells.push(addDays(start, i))
    }
    return cells
}

export function tasksForDateISO(tareas, dateISO) {
    return tareas
        .filter((t) => t.dateISO === dateISO)
        .slice()
        .sort((a, b) => {
            const ta = a.time?.trim() || ''
            const tb = b.time?.trim() || ''
            if (!ta && !tb) return 0
            if (!ta) return 1
            if (!tb) return -1
            return ta.localeCompare(tb, undefined, { numeric: true })
        })
}

/** Tareas en ventana [ahora, ahora + 48h]: con hora = instante puntual; sin hora = todo el día si cruza la ventana. */
export function tasksInNext48Hours(tareas, now = new Date()) {
    const end = new Date(now.getTime() + 48 * 60 * 60 * 1000)
    const out = []

    for (const t of tareas) {
        const [y, mo, d] = t.dateISO.split('-').map(Number)
        const dayStart = new Date(y, mo - 1, d, 0, 0, 0, 0)
        const dayEnd = new Date(y, mo - 1, d, 23, 59, 59, 999)
        let inWindow = false
        let sortInstant
        if (t.time && /^\d{1,2}:\d{2}$/.test(String(t.time).trim())) {
            const [hh, mm] = String(t.time).trim().split(':').map(Number)
            sortInstant = new Date(y, mo - 1, d, hh, mm, 0, 0)
            inWindow = sortInstant >= now && sortInstant <= end
        } else {
            sortInstant = new Date(y, mo - 1, d, 12, 0, 0, 0)
            inWindow = !(dayEnd < now || dayStart > end)
        }
        if (!inWindow) continue
        out.push({ ...t, _sort: sortInstant })
    }

    return out.sort((a, b) => a._sort - b._sort)
}

export function sortTareasByDateTime(tareas) {
    return tareas.slice().sort((a, b) => {
        if (a.dateISO !== b.dateISO) return a.dateISO.localeCompare(b.dateISO)
        const ta = a.time?.trim() || ''
        const tb = b.time?.trim() || ''
        if (!ta && !tb) return 0
        if (!ta) return 1
        if (!tb) return -1
        return ta.localeCompare(tb, undefined, { numeric: true })
    })
}

export function tasksForToday(tareas, now = new Date()) {
    return tasksForDateISO(tareas, toISODate(now))
}

export function tasksThisWeek(tareas, now = new Date()) {
    const start = startOfWeekMonday(now)
    const end = addDays(start, 6)
    const startISO = toISODate(start)
    const endISO = toISODate(end)
    return sortTareasByDateTime(
        tareas.filter((t) => t.dateISO >= startISO && t.dateISO <= endISO),
    )
}

export function tasksOverdue(tareas, now = new Date()) {
    const todayISO = toISODate(now)
    return sortTareasByDateTime(tareas.filter((t) => t.dateISO < todayISO))
}

export function formatTareaVence(t, now = new Date()) {
    const todayISO = toISODate(now)
    const tomorrow = toISODate(addDays(now, 1))
    if (t.dateISO === todayISO) {
        return t.time?.trim() ? `Hoy · ${t.time}` : 'Hoy'
    }
    if (t.dateISO === tomorrow) {
        return t.time?.trim() ? `Mañana · ${t.time}` : 'Mañana'
    }
    const [y, mo, d] = t.dateISO.split('-').map(Number)
    const dt = new Date(y, mo - 1, d)
    const fecha = dt.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })
    return t.time?.trim() ? `${fecha} · ${t.time}` : fecha
}
