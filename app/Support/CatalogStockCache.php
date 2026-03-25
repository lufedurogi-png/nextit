<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;

/**
 * Invalidación barata de listados de producto al confirmar ventas: se incrementa un contador
 * y las claves de caché lo incluyen.
 */
final class CatalogStockCache
{
    private const KEY = 'catalog_stock_epoch';

    public static function epoch(): int
    {
        return (int) Cache::get(self::KEY, 0);
    }

    public static function bump(): void
    {
        $n = self::epoch() + 1;
        Cache::forever(self::KEY, $n);
    }

    public static function suffix(): string
    {
        return '_e'.self::epoch();
    }

    /** Prefija una clave base de caché de catálogo con la época de stock. */
    public static function key(string $base): string
    {
        return $base.self::suffix();
    }
}
