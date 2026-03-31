<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Stock público por clave: refleja el último total desde CVA/manuales.
 * El stock mostrado al cliente es cantidad_base menos las ventas en inventario_ventas.
 */
class CatalogoStockPublico extends Model
{
    protected $table = 'catalogo_stock_publico';

    protected $fillable = [
        'clave',
        'cantidad_base',
    ];

    protected $casts = [
        'cantidad_base' => 'integer',
    ];
}
