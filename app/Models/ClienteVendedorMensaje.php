<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClienteVendedorMensaje extends Model
{
    protected $table = 'cliente_vendedor_mensajes';

    protected $fillable = [
        'user_id',
        'sender_type',
        'seller_id',
        'body',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_id');
    }
}
