<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PedidoEnvio extends Model
{
    protected $table = 'pedido_envios';

    protected $fillable = [
        'pedido_id',
        'subtotal_productos',
        'costo_envio',
        'moneda',
        'fecha_entrega_centro',
        'fecha_entrega_desde',
        'fecha_entrega_hasta',
        'detalle_cotizacion',
    ];

    protected $casts = [
        'subtotal_productos' => 'decimal:2',
        'costo_envio' => 'decimal:2',
        'fecha_entrega_centro' => 'date',
        'fecha_entrega_desde' => 'date',
        'fecha_entrega_hasta' => 'date',
        'detalle_cotizacion' => 'array',
    ];

    public function pedido(): BelongsTo
    {
        return $this->belongsTo(Pedido::class);
    }

    public function itemEnvios(): HasMany
    {
        return $this->hasMany(PedidoItemEnvio::class, 'pedido_envio_id');
    }
}
