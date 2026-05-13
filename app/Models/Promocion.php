<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Promocion extends Model
{
    protected $fillable = [
        'slug',
        'titulo',
        'descripcion',
        'activa',
    ];

    protected $casts = [
        'activa' => 'boolean',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(PromocionItem::class);
    }
}
