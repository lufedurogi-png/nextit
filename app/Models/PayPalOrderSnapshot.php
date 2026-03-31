<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PayPalOrderSnapshot extends Model
{
    protected $table = 'paypal_order_snapshots';

    protected $primaryKey = 'paypal_order_id';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'paypal_order_id',
        'user_id',
        'snapshot',
        'expires_at',
        'pedido_id',
    ];

    protected function casts(): array
    {
        return [
            'snapshot' => 'array',
            'expires_at' => 'datetime',
        ];
    }

    public function pedido(): BelongsTo
    {
        return $this->belongsTo(Pedido::class);
    }
}
