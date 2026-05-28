<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class VentasCorreoEnvio extends Model
{
    protected $table = 'ventas_correo_envios';

    protected $fillable = [
        'user_id',
        'asunto',
        'cuerpo',
        'enviados_count',
        'fallidos_count',
    ];

    public function vendedor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function destinatarios(): HasMany
    {
        return $this->hasMany(VentasCorreoEnvioDestinatario::class, 'ventas_correo_envio_id');
    }

    public function adjuntos(): HasMany
    {
        return $this->hasMany(VentasCorreoEnvioAdjunto::class, 'ventas_correo_envio_id');
    }
}
