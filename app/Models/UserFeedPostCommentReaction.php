<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserFeedPostCommentReaction extends Model
{
    protected $table = 'user_feed_post_comment_reactions';

    protected $fillable = [
        'comment_id',
        'user_id',
        'reaction',
    ];

    public function comment(): BelongsTo
    {
        return $this->belongsTo(UserFeedPostComment::class, 'comment_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
