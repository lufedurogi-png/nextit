<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CollectorGroupCommentReaction extends Model
{
    protected $fillable = [
        'comment_id',
        'user_id',
        'reaction',
    ];

    public function comment(): BelongsTo
    {
        return $this->belongsTo(CollectorGroupComment::class, 'comment_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
