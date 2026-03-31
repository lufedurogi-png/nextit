<?php

namespace App\Services;

use App\Models\CatalogoStockPublico;
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
     * Base de stock intermediario: tabla catalogo_stock_publico (espejo de fuente) o, si no hay fila, disponible+cd del producto.
     */
    public function stockBasePublico(string $clave, int $disponible, int $disponibleCd): int
    {
        if ($clave !== '') {
            $row = CatalogoStockPublico::query()->where('clave', $clave)->first();
            if ($row) {
                return max(0, (int) $row->cantidad_base);
            }
        }

        return max(0, $disponible + $disponibleCd);
    }

    /**
     * Stock mostrado al cliente: base (catálogo público) menos ventas confirmadas en inventario_ventas.
     * Concentramos el total en disponible; disponible_cd queda en 0.
     */
    public function aplicarStockMostrado(array $formatted, int $vendidoAcumulado): array
    {
        $clave = (string) ($formatted['clave'] ?? '');
        $d = (int) ($formatted['disponible'] ?? 0);
        $cd = (int) ($formatted['disponible_cd'] ?? 0);
        $base = $this->stockBasePublico($clave, $d, $cd);
        $v = max(0, $vendidoAcumulado);
        $total = max(0, $base - $v);
        $formatted['disponible'] = $total;
        $formatted['disponible_cd'] = 0;

        return $formatted;
    }

    /** Unidades que el cliente puede pedir: base pública menos vendido acumulado. */
    public function stockEfectivoTotal(string $clave, int $disponible, int $disponibleCd): int
    {
        $base = $this->stockBasePublico($clave, $disponible, $disponibleCd);
        $v = (int) InventarioVenta::query()->where('clave', $clave)->sum('cantidad');

        return max(0, $base - $v);
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
