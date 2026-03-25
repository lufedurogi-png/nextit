<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventarioVenta extends Model
{
    protected $table = 'inventario_ventas';

    protected $fillable = [
        'clave',
        'cantidad',
        'pedido_id',
    ];

    protected $casts = [
        'cantidad' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function pedido(): BelongsTo
    {
        return $this->belongsTo(Pedido::class);
    }
}
