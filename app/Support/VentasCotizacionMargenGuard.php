<?php

namespace App\Support;

use Illuminate\Validation\ValidationException;

/**
 * El precio de catálogo ya incluye el margen de venta.
 * El total cotizado no puede quedar por debajo de (100 − margen)% del precio de referencia.
 */
class VentasCotizacionMargenGuard
{
    public static function precioMinimoUnitario(float $precioReferencia, float $margenPct): float
    {
        if ($precioReferencia <= 0) {
            return 0.0;
        }
        $pct = min(100, max(0, $margenPct));

        return round($precioReferencia * (1 - $pct / 100), 4);
    }

    /**
     * @param  array<int, array<string, mixed>>  $items
     */
    public static function assertCotizacionRespetaMargen(array $items, float $totalCotizado, float $margenPct): void
    {
        $margen = min(100, max(0, $margenPct));
        if ($margen <= 0 || $items === []) {
            return;
        }

        $minimoTotal = 0.0;
        foreach ($items as $idx => $it) {
            $qty = max(1, (int) ($it['cantidad'] ?? 1));
            $precioRef = (float) ($it['precio_referencia'] ?? $it['precio_unitario'] ?? 0);
            $precioUnit = (float) ($it['precio_unitario'] ?? 0);
            $linePct = min(100, max(0, (float) ($it['descuento_linea_pct'] ?? 0)));

            if ($precioRef <= 0) {
                continue;
            }

            $pisoLinea = $qty * self::precioMinimoUnitario($precioRef, $margen);
            $subLinea = round($qty * $precioUnit * (1 - $linePct / 100), 2);
            $minimoTotal += $pisoLinea;

            if ($subLinea + 0.009 < $pisoLinea) {
                $clave = (string) ($it['clave'] ?? ('#' . ($idx + 1)));
                throw ValidationException::withMessages([
                    'items' => [
                        sprintf(
                            'La línea %s supera el descuento máximo permitido (%s%% sobre el precio de catálogo).',
                            $clave,
                            self::formatPct($margen)
                        ),
                    ],
                ]);
            }
        }

        $minimoTotal = round($minimoTotal, 2);
        if ($minimoTotal > 0 && $totalCotizado + 0.009 < $minimoTotal) {
            throw ValidationException::withMessages([
                'descuento_general_pct' => [
                    sprintf(
                        'El total de la cotización no puede ser menor a $%s (máximo %s%% de descuento sobre precios de catálogo).',
                        number_format($minimoTotal, 2, '.', ','),
                        self::formatPct($margen)
                    ),
                ],
            ]);
        }
    }

    private static function formatPct(float $pct): string
    {
        return rtrim(rtrim(number_format($pct, 2, '.', ''), '0'), '.');
    }
}
