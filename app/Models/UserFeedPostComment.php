<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class UserFeedPostComment extends Model
{
    protected $fillable = [
        'post_id',
        'user_id',
        'parent_comment_id',
        'body',
        'images',
        'edited_at',
    ];

    protected function casts(): array
    {
        return [
            'images' => 'array',
            'edited_at' => 'datetime',
        ];
    }

    public function post(): BelongsTo
    {
        return $this->belongsTo(UserFeedPost::class, 'post_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function parentComment(): BelongsTo
    {
        return $this->belongsTo(UserFeedPostComment::class, 'parent_comment_id');
    }

    public function replies(): HasMany
    {
        return $this->hasMany(UserFeedPostComment::class, 'parent_comment_id');
    }

    public function commentReactions(): HasMany
    {
        return $this->hasMany(UserFeedPostCommentReaction::class, 'comment_id');
    }
}
