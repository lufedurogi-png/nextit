<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CollectorGroupComment extends Model
{
    protected $fillable = [
        'post_id',
        'user_id',
        'parent_comment_id',
        'body',
        'images',
    ];

    protected $casts = [
        'images' => 'array',
    ];

    public function post(): BelongsTo
    {
        return $this->belongsTo(CollectorGroupPost::class, 'post_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reactions(): HasMany
    {
        return $this->hasMany(CollectorGroupCommentReaction::class, 'comment_id');
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_comment_id');
    }

    public function replies(): HasMany
    {
        return $this->hasMany(self::class, 'parent_comment_id')->orderBy('id');
    }
}
