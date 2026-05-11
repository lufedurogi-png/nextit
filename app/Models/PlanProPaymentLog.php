<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlanProPaymentLog extends Model
{
    protected $fillable = [
        'user_id',
        'payment_method',
        'gross_amount',
        'currency',
        'processor_fee_estimate',
        'net_after_fee_estimate',
        'net_approx_usd',
        'net_approx_mxn',
        'payment_reference',
    ];

    protected function casts(): array
    {
        return [
            'gross_amount' => 'decimal:2',
            'processor_fee_estimate' => 'decimal:2',
            'net_after_fee_estimate' => 'decimal:2',
            'net_approx_usd' => 'decimal:2',
            'net_approx_mxn' => 'decimal:2',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
