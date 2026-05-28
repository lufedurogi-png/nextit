<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VentasCorreoEnvioAdjunto extends Model
{
    protected $table = 'ventas_correo_envio_adjuntos';

    protected $fillable = [
        'ventas_correo_envio_id',
        'tipo',
        'nombre_original',
        'ruta',
        'mime_type',
        'tamano_bytes',
    ];

    public function envio(): BelongsTo
    {
        return $this->belongsTo(VentasCorreoEnvio::class, 'ventas_correo_envio_id');
    }
}
