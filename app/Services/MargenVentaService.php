<?php

namespace App\Services;

use App\Models\ConfigMargenVenta;
use Illuminate\Support\Facades\Cache;

class MargenVentaService
{
    private const CACHE_KEY = 'config_margen_venta_porcentaje';

    public function getPorcentaje(): float
    {
        return (float) Cache::remember(self::CACHE_KEY, 3600, function () {
            $row = ConfigMargenVenta::query()->first();

            return $row ? round((float) $row->porcentaje, 2) : 0.0;
        });
    }

    /**
     * Precio de venta = precio base (BD) × (1 + margen/100).
     */
    public function aplicarMargen(float $precioBase): float
    {
        if ($precioBase <= 0) {
            return round($precioBase, 2);
        }
        $pct = $this->getPorcentaje();

        return round($precioBase * (1 + $pct / 100), 2);
    }

    public function setPorcentaje(float $porcentaje): void
    {
        $row = ConfigMargenVenta::query()->first();
        if ($row) {
            $row->update(['porcentaje' => round($porcentaje, 2)]);
        } else {
            ConfigMargenVenta::query()->create(['porcentaje' => round($porcentaje, 2)]);
        }
        Cache::forget(self::CACHE_KEY);
        try {
            Cache::flush();
        } catch (\Throwable) {
            // driver sin flush
        }
    }
}
