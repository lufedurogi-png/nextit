<?php

namespace App\Support;

use Illuminate\Support\Facades\Storage;

class VentasCorreoInlineHtml
{
    /**
     * Sustituye [[IMG:n]] por etiquetas &lt;img&gt;.
     *
     * @param  list<array{path?: string, ruta?: string, mime?: string, mime_type?: string}>  $imagenes
     * @param  callable(string): string|null|null  $resolverSrc  Si devuelve URL/CID (p. ej. $message->embed).
     */
    public static function reemplazarMarcadores(string $html, array $imagenes, ?callable $resolverSrc = null): string
    {
        foreach ($imagenes as $i => $img) {
            $etiqueta = self::etiquetaDesdeImagen($img, $resolverSrc);
            if ($etiqueta === null) {
                continue;
            }
            $html = str_replace('[[IMG:'.$i.']]', $etiqueta, $html);
        }

        return preg_replace('/\[\[IMG:\d+\]\]/', '', $html) ?? $html;
    }

    /**
     * @param  array{path?: string, ruta?: string, mime?: string, mime_type?: string}  $img
     */
    private static function etiquetaDesdeImagen(array $img, ?callable $resolverSrc): ?string
    {
        $path = self::resolverRutaAbsoluta($img);
        if ($path === null) {
            return null;
        }

        $src = null;
        if ($resolverSrc !== null) {
            try {
                $src = $resolverSrc($path);
            } catch (\Throwable) {
                $src = null;
            }
        }

        if ($src === null || $src === '') {
            $contenido = @file_get_contents($path);
            if ($contenido === false) {
                return null;
            }
            $mime = $img['mime'] ?? $img['mime_type'] ?? (mime_content_type($path) ?: 'image/jpeg');
            $src = 'data:'.$mime.';base64,'.base64_encode($contenido);
        }

        return '<img src="'.htmlspecialchars($src, ENT_QUOTES, 'UTF-8').'" alt="" style="max-width:100%;height:auto;display:block;margin:12px 0;border-radius:6px;" />';
    }

    /**
     * @param  array{path?: string, ruta?: string}  $img
     */
    private static function resolverRutaAbsoluta(array $img): ?string
    {
        $path = $img['path'] ?? '';
        if ($path !== '' && is_readable($path)) {
            return $path;
        }

        $ruta = $img['ruta'] ?? '';
        if ($ruta === '') {
            return null;
        }

        $absoluta = Storage::disk('local')->path($ruta);
        if (is_readable($absoluta)) {
            return $absoluta;
        }

        return null;
    }
}
