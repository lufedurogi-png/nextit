<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CotizacionInvitado extends Model
{
    protected $table = 'cotizacion_invitados';

    protected $fillable = [
        'email',
        'total',
    ];

    protected $casts = [
        'total' => 'decimal:2',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(CotizacionInvitadoItem::class, 'cotizacion_invitado_id');
    }
}
