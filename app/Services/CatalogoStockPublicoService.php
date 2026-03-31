<?php

namespace App\Services;

use App\Models\CatalogoStockPublico;
use App\Support\CatalogStockCache;

class CatalogoStockPublicoService
{
    /** Actualiza el stock ofrecido desde la fuente (CVA sync o edición manual). */
    public function sincronizarDesdeFuente(string $clave, int $disponible, int $disponibleCd, bool $bumpCatalogoCache = true): void
    {
        if ($clave === '') {
            return;
        }
        $total = max(0, $disponible + $disponibleCd);
        CatalogoStockPublico::query()->updateOrCreate(
            ['clave' => $clave],
            ['cantidad_base' => $total]
        );
        if ($bumpCatalogoCache) {
            CatalogStockCache::bump();
        }
    }

    public function eliminarPorClave(string $clave, bool $bumpCatalogoCache = true): void
    {
        if ($clave === '') {
            return;
        }
        CatalogoStockPublico::query()->where('clave', $clave)->delete();
        if ($bumpCatalogoCache) {
            CatalogStockCache::bump();
        }
    }
}
