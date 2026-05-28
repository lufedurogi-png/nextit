<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VentasCalendarioTarea extends Model
{
    protected $table = 'ventas_calendario_tareas';

    protected $fillable = [
        'user_id',
        'fecha',
        'hora',
        'texto',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'fecha' => 'date',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
