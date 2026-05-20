/**
 * Comprime imágenes en el navegador antes de subirlas (feed, comentarios, perfil).
 * El usuario puede elegir fotos pesadas; el sistema las reduce sin un límite duro en la UI.
 */

const DEFAULTS = {
    maxDimension: 1920,
    maxOutputBytes: 1_500_000,
    initialQuality: 0.86,
    minQuality: 0.52,
    skipBelowBytes: 400_000,
}

function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), type, quality)
    })
}

/**
 * @param {File} file
 * @param {Partial<typeof DEFAULTS>} [options]
 * @returns {Promise<File>}
 */
export async function compressImageForUpload(file, options = {}) {
    const opts = { ...DEFAULTS, ...options }
    if (!(file instanceof File) || file.size === 0) return file
    if (file.type === 'image/gif') return file
    if (!String(file.type || '').startsWith('image/')) return file
    if (file.size <= opts.skipBelowBytes) return file

    let bitmap
    try {
        bitmap = await createImageBitmap(file)
    } catch {
        return file
    }

    try {
        const maxSide = Math.max(bitmap.width, bitmap.height)
        const scale = maxSide > opts.maxDimension ? opts.maxDimension / maxSide : 1
        const w = Math.max(1, Math.round(bitmap.width * scale))
        const h = Math.max(1, Math.round(bitmap.height * scale))

        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d', { alpha: false })
        if (!ctx) return file

        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, w, h)
        ctx.drawImage(bitmap, 0, 0, w, h)

        const outMime = file.type === 'image/webp' ? 'image/webp' : 'image/jpeg'
        const baseName = (file.name || 'imagen').replace(/\.[^.]+$/, '') || 'imagen'
        const ext = outMime === 'image/webp' ? 'webp' : 'jpg'

        let quality = opts.initialQuality
        let blob = null
        while (quality >= opts.minQuality) {
            blob = await canvasToBlob(canvas, outMime, quality)
            if (!blob || blob.size === 0) break
            if (blob.size <= opts.maxOutputBytes) break
            quality -= 0.07
        }

        if (!blob || blob.size === 0) return file

        const outFile = new File([blob], `${baseName}.${ext}`, { type: outMime, lastModified: Date.now() })
        return outFile.size <= file.size ? outFile : file
    } finally {
        bitmap?.close?.()
    }
}

/**
 * @param {FileList|File[]} fileList
 * @returns {Promise<Array<{ id: string, file: File, previewUrl: string }>>}
 */
export async function createImageEntriesFromFileList(fileList) {
    const list = Array.from(fileList || []).filter((f) => f instanceof File && f.size > 0)
    const compressed = await Promise.all(list.map((f) => compressImageForUpload(f)))
    return compressed.map((file) => ({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        file,
        previewUrl: URL.createObjectURL(file),
    }))
}
