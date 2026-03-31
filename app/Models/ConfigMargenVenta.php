<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Una sola fila de configuración: margen global (%) sobre precio de proveedor (CVA / manual).
 */
class ConfigMargenVenta extends Model
{
    protected $table = 'config_margen_venta';

    protected $fillable = [
        'porcentaje',
    ];

    protected $casts = [
        'porcentaje' => 'float',
    ];
}
