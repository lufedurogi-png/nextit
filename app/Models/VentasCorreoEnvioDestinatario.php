<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VentasCorreoEnvioDestinatario extends Model
{
    protected $table = 'ventas_correo_envio_destinatarios';

    protected $fillable = [
        'ventas_correo_envio_id',
        'ventas_correo_destinatario_id',
        'email',
        'nombre',
        'estado',
        'error_mensaje',
    ];

    public function envio(): BelongsTo
    {
        return $this->belongsTo(VentasCorreoEnvio::class, 'ventas_correo_envio_id');
    }
}
