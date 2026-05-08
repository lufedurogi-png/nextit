<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScanUsageEvent extends Model
{
    protected $fillable = [
        'user_id',
        'collection_id',
        'franchise_stamp_id',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function collection(): BelongsTo
    {
        return $this->belongsTo(Collection::class);
    }

    public function franchiseStamp(): BelongsTo
    {
        return $this->belongsTo(FranchiseStamp::class);
    }
}
