<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClienteVentasMensaje extends Model
{
    protected $table = 'cliente_ventas_mensajes';

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

    public function isFromCustomer(): bool
    {
        return $this->sender_type === 'customer';
    }

    public function isFromSeller(): bool
    {
        return in_array($this->sender_type, ['seller', 'admin'], true);
    }

    public function isFromAdmin(): bool
    {
        return $this->sender_type === 'admin';
    }
}
