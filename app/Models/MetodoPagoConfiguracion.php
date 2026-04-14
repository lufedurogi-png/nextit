<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MetodoPagoConfiguracion extends Model
{
    protected $table = 'metodos_pago_configuracion';

    protected $fillable = [
        'codigo',
        'activo',
        'updated_by_user_id',
    ];

    protected $casts = [
        'activo' => 'bool',
        'updated_by_user_id' => 'int',
    ];
}

