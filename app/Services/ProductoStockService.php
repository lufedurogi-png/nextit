<?php

namespace App\Services;

use App\Models\InventarioVenta;
use App\Support\CatalogStockCache;

class ProductoStockService
{
    /** @return array<string, int> clave => unidades vendidas acumuladas */
    public function cantidadesVendidasPorClaves(array $claves): array
    {
        $claves = array_values(array_unique(array_filter($claves)));
        if ($claves === []) {
            return [];
        }

        $rows = InventarioVenta::query()
            ->whereIn('clave', $claves)
            ->groupBy('clave')
            ->selectRaw('clave, SUM(cantidad) as total')
            ->get();

        $out = [];
        foreach ($rows as $row) {
            $out[$row->clave] = (int) $row->total;
        }

        return $out;
    }

    /**
     * Stock mostrado al cliente: resta ventas confirmadas del total en BD (disponible + disponible_cd).
     * La suma expuesta sigue siendo disponible + disponible_cd; concentramos el resto en disponible.
     */
    public function aplicarStockMostrado(array $formatted, int $vendido): array
    {
        if ($vendido <= 0) {
            return $formatted;
        }
        $d = (int) ($formatted['disponible'] ?? 0);
        $cd = (int) ($formatted['disponible_cd'] ?? 0);
        $total = max(0, $d + $cd - $vendido);
        $formatted['disponible'] = $total;
        $formatted['disponible_cd'] = 0;

        return $formatted;
    }

    /** Stock efectivo para una clave (producto en BD menos vendido acumulado). */
    public function stockEfectivoTotal(string $clave, int $disponible, int $disponibleCd): int
    {
        $v = (int) InventarioVenta::query()->where('clave', $clave)->sum('cantidad');

        return max(0, $disponible + $disponibleCd - $v);
    }

    public function registrarVentasConfirmadas(int $pedidoId, iterable $lineas, bool $bumpCatalogCache = true): void
    {
        foreach ($lineas as $linea) {
            $clave = is_array($linea) ? ($linea['clave'] ?? '') : $linea->clave;
            $cantidad = (int) (is_array($linea) ? ($linea['cantidad'] ?? 0) : $linea->cantidad);
            if ($clave === '' || $cantidad <= 0) {
                continue;
            }
            InventarioVenta::query()->create([
                'clave' => $clave,
                'cantidad' => $cantidad,
                'pedido_id' => $pedidoId,
            ]);
        }
        if ($bumpCatalogCache) {
            CatalogStockCache::bump();
        }
    }
}
