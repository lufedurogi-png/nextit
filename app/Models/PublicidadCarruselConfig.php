<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PublicidadCarruselConfig extends Model
{
    protected $table = 'publicidad_carrusel_config';

    public $incrementing = false;

    protected $keyType = 'int';

    protected $primaryKey = 'id';

    protected $fillable = [
        'id',
        'activo',
    ];

    protected $casts = [
        'activo' => 'integer',
    ];

    public static function singleton(): self
    {
        return static::query()->firstOrCreate(
            ['id' => 1],
            ['activo' => 1]
        );
    }
}
