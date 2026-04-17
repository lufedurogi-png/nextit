<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PedidoItemEnvio extends Model
{
    protected $table = 'pedido_item_envios';

    protected $fillable = [
        'pedido_item_id',
        'pedido_envio_id',
        'almacen_origen_label',
        'almacen_cp_origen',
        'costo_envio_prorrateado',
        'meta_linea',
    ];

    protected $casts = [
        'costo_envio_prorrateado' => 'decimal:2',
        'meta_linea' => 'array',
    ];

    public function pedidoItem(): BelongsTo
    {
        return $this->belongsTo(PedidoItem::class, 'pedido_item_id');
    }

    public function pedidoEnvio(): BelongsTo
    {
        return $this->belongsTo(PedidoEnvio::class, 'pedido_envio_id');
    }
}
