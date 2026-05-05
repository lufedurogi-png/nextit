<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CollectorGroupBan extends Model
{
    protected $fillable = [
        'group_id',
        'user_id',
    ];

    public function group(): BelongsTo
    {
        return $this->belongsTo(CollectorGroup::class, 'group_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
