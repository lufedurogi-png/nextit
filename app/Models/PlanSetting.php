<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Configuración comercial del plan Pro (precio, moneda, duración).
 * Única fuente para la vista /planes y para los cobros (MP, PayPal, tarjeta simulada).
 */
class PlanSetting extends Model
{
    protected $table = 'plan_settings';

    protected $fillable = [
        'pro_price',
        'pro_currency',
        'billing_period_days',
        'pro_features',
    ];

    protected function casts(): array
    {
        return [
            'pro_price' => 'decimal:2',
            'billing_period_days' => 'int',
            'pro_features' => 'array',
        ];
    }

    public static function current(): self
    {
        $row = static::query()->orderBy('id')->first();
        if ($row !== null) {
            return $row;
        }

        return new static([
            'pro_price' => 99,
            'pro_currency' => 'MXN',
            'billing_period_days' => 30,
            'pro_features' => [],
        ]);
    }
}
