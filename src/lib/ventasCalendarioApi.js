import axios from '@/lib/axios'

/** Normaliza respuesta del backend al shape usado por la UI. */
function mapTarea(row) {
    if (!row || typeof row !== 'object') return null
    return {
        id: row.id,
        dateISO: row.dateISO,
        time: row.time ?? null,
        text: row.text ?? '',
        createdAt: row.createdAt ?? null,
    }
}

export async function fetchCalendarioTareas() {
    const { data } = await axios.get('/ventas/calendario/tareas')
    if (!data?.success || !Array.isArray(data.data)) {
        throw new Error(data?.message || 'No se pudieron cargar las tareas.')
    }
    return data.data.map(mapTarea).filter(Boolean)
}

export async function createCalendarioTarea({ fecha, hora, texto }) {
    const payload = {
        fecha,
        texto,
    }
    if (hora) payload.hora = hora
    const { data } = await axios.post('/ventas/calendario/tareas', payload)
    if (!data?.success || !data.data) {
        throw new Error(data?.message || 'No se pudo crear la tarea.')
    }
    return mapTarea(data.data)
}

export async function deleteCalendarioTarea(id) {
    const { data } = await axios.delete(`/ventas/calendario/tareas/${id}`)
    if (!data?.success) {
        throw new Error(data?.message || 'No se pudo eliminar la tarea.')
    }
}
