<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VentasCorreoPlantilla extends Model
{
    protected $table = 'ventas_correo_plantillas';

    protected $fillable = [
        'user_id',
        'nombre',
        'cuerpo_html',
    ];

    public function vendedor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
