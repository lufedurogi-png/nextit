<?php

namespace App\Support;

/**
 * Cantidades en letra (es-MX) para documentos (PDF).
 */
class NumeroLetraMx
{
    private static function under100(int $n): string
    {
        $u = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
        $d = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
        $e = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];

        if ($n < 10) {
            return $u[$n];
        }
        if ($n < 20) {
            return $e[$n - 10];
        }
        $de = (int) floor($n / 10);
        $un = $n % 10;
        if ($un === 0) {
            return $d[$de];
        }
        if ($de === 2) {
            return 'veinti'.$u[$un];
        }

        return $d[$de].' y '.$u[$un];
    }

    private static function under1000(int $n): string
    {
        if ($n === 0) {
            return '';
        }
        if ($n === 100) {
            return 'cien';
        }
        $ce = (int) floor($n / 100);
        $r = $n % 100;
        $c = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];
        $head = $ce > 0 ? $c[$ce] : '';
        $tail = $r > 0 ? self::under100($r) : '';

        return trim($head.($head && $tail ? ' ' : '').$tail);
    }

    public static function entero(int $ent): string
    {
        $ent = abs($ent);
        if ($ent === 0) {
            return 'cero';
        }
        if ($ent > 999999999) {
            return '';
        }

        $mill = (int) floor($ent / 1000000);
        $rest = $ent % 1000000;
        $mil = (int) floor($rest / 1000);
        $u = $rest % 1000;

        $parts = [];
        if ($mill === 1) {
            $parts[] = 'un millón';
        } elseif ($mill > 1) {
            $parts[] = trim(self::under1000($mill).' millones');
        }

        if ($mil === 1) {
            $parts[] = 'mil';
        } elseif ($mil > 1) {
            $parts[] = trim(self::under1000($mil).' mil');
        }

        if ($u > 0) {
            $parts[] = self::under1000($u);
        }

        return trim(preg_replace('/\s+/', ' ', implode(' ', $parts)));
    }

    public static function monto(float $valor): string
    {
        $valor = round(abs($valor), 2);
        $ent = (int) floor($valor);
        $cents = (int) round(($valor - $ent) * 100);
        if ($cents >= 100) {
            $ent += 1;
            $cents -= 100;
        }
        $letras = ucfirst(self::entero($ent));

        return $letras.' PESOS '.str_pad((string) $cents, 2, '0', STR_PAD_LEFT).'/100 M.N.';
    }

    public static function cantidadHtml(int|string $n): string
    {
        $i = (int) $n;

        return e($i).'<br><span style="font-size:8.5px;">('.e(self::entero($i)).')</span>';
    }

    public static function montoHtml(float $valor): string
    {
        $fmt = number_format($valor, 2, '.', ',');

        return '$ '.e($fmt).'<br><span style="font-size:8.5px;">('.e(self::monto($valor)).')</span>';
    }
}
