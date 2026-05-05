<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class UserFeedPost extends Model
{
    protected $fillable = [
        'user_id',
        'parent_post_id',
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

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reactions(): HasMany
    {
        return $this->hasMany(UserFeedPostReaction::class, 'post_id');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(UserFeedPostComment::class, 'post_id');
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(UserFeedPost::class, 'parent_post_id');
    }

    public function shares(): HasMany
    {
        return $this->hasMany(UserFeedPost::class, 'parent_post_id');
    }
}
