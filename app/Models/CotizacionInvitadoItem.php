<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CotizacionInvitadoItem extends Model
{
    protected $table = 'cotizacion_invitado_items';

    protected $fillable = [
        'cotizacion_invitado_id',
        'clave',
        'nombre_producto',
        'cantidad',
        'precio_unitario',
        'imagen',
    ];

    protected $casts = [
        'cantidad' => 'integer',
        'precio_unitario' => 'decimal:2',
    ];

    public function cotizacionInvitado(): BelongsTo
    {
        return $this->belongsTo(CotizacionInvitado::class, 'cotizacion_invitado_id');
    }
}
