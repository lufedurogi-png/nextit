<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Publicidad extends Model
{
    protected $table = 'publicidad';

    protected $fillable = [
        'url',
        'path',
        'orden',
        'titulo',
        'enlace',
        'activo',
    ];

    protected $casts = [
        'activo' => 'boolean',
        'orden' => 'integer',
    ];
}
