<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PromocionItem extends Model
{
    protected $fillable = [
        'promocion_id',
        'clave',
        'orden',
    ];

    protected $casts = [
        'orden' => 'integer',
    ];

    public function promocion(): BelongsTo
    {
        return $this->belongsTo(Promocion::class);
    }
}
