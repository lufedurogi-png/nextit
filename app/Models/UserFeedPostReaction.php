<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserFeedPostReaction extends Model
{
    protected $fillable = [
        'post_id',
        'user_id',
        'reaction',
    ];

    public function post(): BelongsTo
    {
        return $this->belongsTo(UserFeedPost::class, 'post_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
