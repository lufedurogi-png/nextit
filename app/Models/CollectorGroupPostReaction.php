<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CollectorGroupPostReaction extends Model
{
    protected $fillable = [
        'post_id',
        'user_id',
        'reaction',
    ];

    public function post(): BelongsTo
    {
        return $this->belongsTo(CollectorGroupPost::class, 'post_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
