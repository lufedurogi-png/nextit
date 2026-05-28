<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VentasCotizacion extends Model
{
    protected $table = 'ventas_cotizaciones';

    protected $fillable = [
        'user_id',
        'folio',
        'cliente_user_id',
        'invitado_nombre',
        'invitado_email',
        'invitado_telefono',
        'comentario',
        'descuento_general_pct',
        'items',
        'total',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'items' => 'array',
            'descuento_general_pct' => 'decimal:2',
            'total' => 'decimal:2',
        ];
    }

    public function vendedor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function clienteRegistrado(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cliente_user_id');
    }
}
