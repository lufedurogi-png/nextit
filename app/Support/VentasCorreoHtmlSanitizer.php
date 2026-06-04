<?php

namespace App\Support;

class VentasCorreoHtmlSanitizer
{
    private const ALLOWED_TAGS = '<p><br><b><strong><i><em><u><ul><ol><li><span><div>';

    /** Valores exactos permitidos en font-family (deben coincidir con el editor). */
    private const FONT_FAMILIES = [
        'Arial, Helvetica, sans-serif',
        'Helvetica, Arial, sans-serif',
        'Verdana, Geneva, sans-serif',
        'Tahoma, Geneva, sans-serif',
        'Trebuchet MS, Helvetica, sans-serif',
        'Segoe UI, Tahoma, Geneva, sans-serif',
        'Calibri, Arial, sans-serif',
        'Century Gothic, sans-serif',
        'Franklin Gothic Medium, Arial, sans-serif',
        'Gill Sans, Gill Sans MT, Calibri, sans-serif',
        'Lucida Sans Unicode, Lucida Grande, sans-serif',
        'Candara, Calibri, Segoe, sans-serif',
        'Optima, Segoe, Candara, sans-serif',
        'Futura, Trebuchet MS, Arial, sans-serif',
        'Times New Roman, Times, serif',
        'Georgia, Times New Roman, Times, serif',
        'Palatino Linotype, Book Antiqua, Palatino, serif',
        'Garamond, Baskerville, Times New Roman, serif',
        'Book Antiqua, Palatino, serif',
        'Cambria, Georgia, serif',
        'Courier New, Courier, monospace',
        'Consolas, Monaco, monospace',
        'Lucida Console, Monaco, monospace',
        'Monaco, Consolas, monospace',
        'Comic Sans MS, cursive, sans-serif',
        'Brush Script MT, cursive',
        'Impact, Haettenschweiler, Arial Narrow, sans-serif',
        'Arial Black, Arial Bold, Gadget, sans-serif',
    ];

    private const FONT_SIZES = ['10px', '11px', '12px', '13px', '14px', '16px', '18px', '20px', '22px', '24px', '28px', '32px', '36px'];

    private const TEXT_COLORS = [
        '#1f2937', '#4b5563', '#ea580c', '#dc2626', '#db2777', '#7c3aed',
        '#2563eb', '#0891b2', '#16a34a', '#65a30d', '#ca8a04', '#92400e',
    ];

    /** Colores de resaltado (marcador) — deben coincidir con el editor. */
    private const HIGHLIGHT_COLORS = [
        'transparent',
        '#fef08a', '#bbf7d0', '#a5f3fc', '#bfdbfe', '#fbcfe8', '#fed7aa',
        '#e9d5ff', '#fecaca', '#e5e7eb', '#d9f99d', '#ffedd5',
    ];

    public static function sanitize(string $html): string
    {
        $html = trim($html);
        if ($html === '') {
            return '';
        }

        $clean = strip_tags($html, self::ALLOWED_TAGS);

        $clean = preg_replace_callback('/<span(\s[^>]*)>/i', function (array $m): string {
            $attrs = $m[1];
            if (preg_match('/style\s*=\s*("|\')([^"\']*)\1/i', $attrs, $sm)) {
                $safe = self::sanitizeStyleAttribute($sm[2]);
                if ($safe !== '') {
                    return '<span style="'.htmlspecialchars($safe, ENT_QUOTES, 'UTF-8').'">';
                }
            }

            return '<span>';
        }, $clean) ?? $clean;

        $clean = preg_replace('/<(p|br|b|strong|i|em|u|ul|ol|li|div)(\s[^>]*)?>/i', '<$1>', $clean) ?? $clean;
        $clean = preg_replace('/<\/(p|b|strong|i|em|u|ul|ol|li|span|div)(\s[^>]*)?>/i', '</$1>', $clean) ?? $clean;

        return trim($clean);
    }

    private static function sanitizeStyleAttribute(string $style): string
    {
        $allowed = [];
        foreach (explode(';', $style) as $decl) {
            $decl = trim($decl);
            if ($decl === '') {
                continue;
            }
            $parts = explode(':', $decl, 2);
            if (count($parts) !== 2) {
                continue;
            }
            $prop = strtolower(trim($parts[0]));
            $val = trim($parts[1]);
            $safeVal = self::sanitizeStyleValue($prop, $val);
            if ($safeVal !== null) {
                $allowed[] = $prop.': '.$safeVal;
            }
        }

        return implode('; ', $allowed);
    }

    private static function sanitizeStyleValue(string $prop, string $val): ?string
    {
        return match ($prop) {
            'font-family' => self::sanitizeFontFamily($val),
            'font-size' => self::sanitizeFontSize($val),
            'color' => self::sanitizeColor($val),
            'text-decoration' => in_array(strtolower($val), ['underline', 'none'], true) ? strtolower($val) : null,
            'text-decoration-color' => self::sanitizeColor($val),
            'text-decoration-line' => in_array(strtolower($val), ['underline', 'none'], true) ? strtolower($val) : null,
            'font-weight' => in_array(strtolower($val), ['bold', 'normal', '700', '400'], true) ? strtolower($val) : null,
            'font-style' => in_array(strtolower($val), ['italic', 'normal'], true) ? strtolower($val) : null,
            'background-color' => self::sanitizeHighlightColor($val),
            default => null,
        };
    }

    private static function sanitizeHighlightColor(string $val): ?string
    {
        $val = strtolower(trim($val));
        if ($val === 'transparent') {
            return 'transparent';
        }

        return in_array($val, self::HIGHLIGHT_COLORS, true) ? $val : null;
    }

    private static function sanitizeFontFamily(string $val): ?string
    {
        $val = trim($val, " \t\n\r\0\x0B\"'");
        foreach (self::FONT_FAMILIES as $allowed) {
            if (strcasecmp($val, $allowed) === 0) {
                return $allowed;
            }
        }

        return null;
    }

    private static function sanitizeFontSize(string $val): ?string
    {
        $val = strtolower(trim($val));
        if (in_array($val, self::FONT_SIZES, true)) {
            return $val;
        }

        return null;
    }

    private static function sanitizeColor(string $val): ?string
    {
        $val = strtolower(trim($val));
        if (preg_match('/^#([0-9a-f]{3}|[0-9a-f]{6})$/', $val) === 1) {
            return in_array($val, self::TEXT_COLORS, true) ? $val : null;
        }

        return in_array($val, self::TEXT_COLORS, true) ? $val : null;
    }

    public static function tieneContenido(string $html): bool
    {
        if (preg_match('/\[\[IMG:\d+\]\]/', $html)) {
            return true;
        }

        if (str_contains($html, VentasCorreoPersonalizacion::ETIQUETA_USUARIOS)) {
            return true;
        }

        $texto = html_entity_decode(strip_tags($html));
        $texto = preg_replace('/\[\[IMG:\d+\]\]/', '', $texto) ?? $texto;
        $texto = str_replace(VentasCorreoPersonalizacion::ETIQUETA_USUARIOS, '', $texto);

        return trim($texto) !== '';
    }
}
