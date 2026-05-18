/**
 * Reduce peso y dimensiones de fotos antes de subir historias (móvil: HEIC, 10+ MB, etc.).
 * Mantiene buena calidad visual con límites amplios para el servidor.
 */
const DEFAULTS = {
    maxLongEdge: 2560,
    maxBytes: 5 * 1024 * 1024,
    startQuality: 0.9,
    minQuality: 0.68,
    qualityStep: 0.07,
}

function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file)
        const img = new Image()
        img.onload = () => {
            URL.revokeObjectURL(url)
            resolve(img)
        }
        img.onerror = () => {
            URL.revokeObjectURL(url)
            reject(new Error('No se pudo leer la imagen.'))
        }
        img.src = url
    })
}

function scaleDimensions(width, height, maxLongEdge) {
    const w = width || 1
    const h = height || 1
    const long = Math.max(w, h)
    if (long <= maxLongEdge) return { width: w, height: h }
    const scale = maxLongEdge / long
    return {
        width: Math.max(1, Math.round(w * scale)),
        height: Math.max(1, Math.round(h * scale)),
    }
}

function canvasToJpegBlob(canvas, quality) {
    return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality)
    })
}

function safeBaseName(file) {
    const raw = String(file?.name || 'historia').replace(/\.[^.]+$/, '')
    const cleaned = raw.replace(/[^\w.\-]+/g, '_').slice(0, 80)
    return cleaned || 'historia'
}

/**
 * @param {File} file
 * @param {Partial<typeof DEFAULTS>} [opts]
 * @returns {Promise<File>}
 */
export async function prepareStoryImageForUpload(file, opts = {}) {
    if (!(file instanceof File) || file.size <= 0) {
        throw new Error('Archivo de imagen inválido.')
    }

    const options = { ...DEFAULTS, ...opts }

    // Ya es JPEG/WebP pequeño: evitar reprocesar de más
    const isRaster = /^image\/(jpeg|jpg|webp|png)$/i.test(file.type || '')
    if (isRaster && file.size <= options.maxBytes && file.size <= 1.5 * 1024 * 1024) {
        return file
    }

    const img = await loadImageFromFile(file)
    const { width, height } = scaleDimensions(img.naturalWidth, img.naturalHeight, options.maxLongEdge)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('No se pudo procesar la imagen en este dispositivo.')

    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(img, 0, 0, width, height)

    let quality = options.startQuality
    let blob = await canvasToJpegBlob(canvas, quality)
    while (blob && blob.size > options.maxBytes && quality > options.minQuality) {
        quality = Math.max(options.minQuality, quality - options.qualityStep)
        blob = await canvasToJpegBlob(canvas, quality)
    }

    if (!blob) throw new Error('No se pudo comprimir la imagen.')

    return new File([blob], `${safeBaseName(file)}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now(),
    })
}
