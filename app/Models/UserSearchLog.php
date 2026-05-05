<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserSearchLog extends Model
{
    protected $fillable = [
        'user_id',
        'query',
        'context',
        'hits',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
