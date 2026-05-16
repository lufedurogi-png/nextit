import { NextResponse } from 'next/server'
import { getDownloadMediaAllowedHosts, isDownloadMediaHostAllowed } from '@/lib/downloadMediaHosts'

function sanitizeFilename(input) {
    let s = String(input || 'viku-imagen.jpg')
        .replace(/[^a-zA-Z0-9._-]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, 120)
    if (!s) s = 'viku-imagen.jpg'
    if (!/\./.test(s)) s = `${s}.jpg`
    return s
}

function storageLikePath(pathname) {
    const p = String(pathname || '')
    return p.startsWith('/storage/') || p.includes('/storage/')
}

export async function GET(request) {
    const { searchParams } = new URL(request.url)
    const rawUrl = searchParams.get('url')
    const nameParam = searchParams.get('name')

    if (!rawUrl || typeof rawUrl !== 'string') {
        return NextResponse.json({ error: 'Falta el parámetro url.' }, { status: 400 })
    }

    let target
    try {
        target = new URL(rawUrl)
    } catch {
        return NextResponse.json({ error: 'URL inválida.' }, { status: 400 })
    }

    if (target.protocol !== 'http:' && target.protocol !== 'https:') {
        return NextResponse.json({ error: 'Solo se permiten http(s).' }, { status: 400 })
    }

    const allowed = getDownloadMediaAllowedHosts()
    if (allowed.size === 0) {
        return NextResponse.json(
            { error: 'No hay hosts permitidos. Configura NEXT_PUBLIC_BACKEND_URL y/o DOWNLOAD_MEDIA_ALLOWED_HOSTS.' },
            { status: 503 },
        )
    }

    if (!isDownloadMediaHostAllowed(target.hostname, allowed)) {
        return NextResponse.json({ error: 'Host no permitido para descarga.' }, { status: 403 })
    }

    if (!storageLikePath(target.pathname)) {
        return NextResponse.json({ error: 'Solo rutas de almacenamiento (/storage/...).' }, { status: 403 })
    }

    const filename = sanitizeFilename(nameParam || target.pathname.split('/').pop() || 'imagen.jpg')

    let upstream
    try {
        upstream = await fetch(target.toString(), {
            method: 'GET',
            redirect: 'follow',
            headers: { 'User-Agent': 'VikuFrontDownload/1.0' },
            cache: 'no-store',
        })
    } catch {
        return NextResponse.json({ error: 'No se pudo obtener el recurso.' }, { status: 502 })
    }

    if (!upstream.ok) {
        return NextResponse.json({ error: 'El origen devolvió un error.' }, { status: upstream.status >= 400 ? upstream.status : 502 })
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream'
    const disposition = `attachment; filename="${filename.replace(/"/g, '')}"`

    return new NextResponse(upstream.body, {
        status: 200,
        headers: {
            'Content-Type': contentType,
            'Content-Disposition': disposition,
            'Cache-Control': 'private, no-store',
        },
    })
}
