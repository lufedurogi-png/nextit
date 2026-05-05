<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FranchiseStamp extends Model
{
    protected $fillable = [
        'franchise_id',
        'player_name',
        'country_code',
        'dob',
        'height',
        'weight',
        'stats_line',
        'club',
        'external_code',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'meta' => 'array',
        ];
    }

    public function franchise(): BelongsTo
    {
        return $this->belongsTo(Franchise::class);
    }
}
