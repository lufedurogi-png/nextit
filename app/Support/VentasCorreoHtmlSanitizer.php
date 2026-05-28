<?php

namespace App\Support;

class VentasCorreoHtmlSanitizer
{
    private const ALLOWED_TAGS = '<p><br><b><strong><i><em><u><ul><ol><li><span><div>';

    public static function sanitize(string $html): string
    {
        $html = trim($html);
        if ($html === '') {
            return '';
        }

        $clean = strip_tags($html, self::ALLOWED_TAGS);
        $clean = preg_replace('/<(p|br|b|strong|i|em|u|ul|ol|li|span|div)(\s[^>]*)?>/i', '<$1>', $clean) ?? $clean;
        $clean = preg_replace('/<\/(p|b|strong|i|em|u|ul|ol|li|span|div)(\s[^>]*)?>/i', '</$1>', $clean) ?? $clean;

        return trim($clean);
    }

    public static function tieneContenido(string $html): bool
    {
        if (preg_match('/\[\[IMG:\d+\]\]/', $html)) {
            return true;
        }

        $texto = html_entity_decode(strip_tags($html));
        $texto = preg_replace('/\[\[IMG:\d+\]\]/', '', $texto) ?? $texto;

        return trim($texto) !== '';
    }
}
