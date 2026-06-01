<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class VentasCorreoGrupo extends Model
{
    protected $table = 'ventas_correo_grupos';

    protected $fillable = [
        'user_id',
        'nombre',
    ];

    public function vendedor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function destinatarios(): HasMany
    {
        return $this->hasMany(VentasCorreoDestinatario::class, 'ventas_correo_grupo_id');
    }
}
