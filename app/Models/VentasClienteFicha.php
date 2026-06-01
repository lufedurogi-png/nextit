<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VentasClienteFicha extends Model
{
    protected $table = 'ventas_cliente_fichas';

    protected $fillable = [
        'seller_id',
        'cliente_user_id',
        'notas',
    ];

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_id');
    }

    public function cliente(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cliente_user_id');
    }
}
