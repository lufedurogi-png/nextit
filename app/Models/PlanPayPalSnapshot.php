<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlanPayPalSnapshot extends Model
{
    protected $table = 'plan_paypal_snapshots';

    protected $primaryKey = 'paypal_order_id';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'paypal_order_id',
        'user_id',
        'snapshot',
        'expires_at',
        'applied_at',
    ];

    protected function casts(): array
    {
        return [
            'snapshot' => 'array',
            'expires_at' => 'datetime',
            'applied_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
