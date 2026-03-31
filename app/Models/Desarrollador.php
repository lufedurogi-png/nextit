<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Desarrollador extends Model
{
    protected $table = 'desarrolladores';

    protected $fillable = [
        'nombre',
        'rol',
        'descripcion',
        'foto_url',
        'foto_path',
        'fecha_inicio',
        'fecha_fin',
        'orden',
        'activo',
    ];

    protected $casts = [
        'fecha_inicio' => 'date',
        'fecha_fin' => 'date',
        'orden' => 'integer',
        'activo' => 'boolean',
    ];
}

