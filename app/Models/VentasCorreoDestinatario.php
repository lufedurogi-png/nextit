<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VentasCorreoDestinatario extends Model
{
    protected $table = 'ventas_correo_destinatarios';

    protected $fillable = [
        'user_id',
        'email',
        'nombre',
    ];

    public function vendedor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
