<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CollectorGroupPost extends Model
{
    protected $fillable = [
        'group_id',
        'user_id',
        'body',
        'images',
    ];

    protected $casts = [
        'images' => 'array',
    ];

    public function group(): BelongsTo
    {
        return $this->belongsTo(CollectorGroup::class, 'group_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function comments(): HasMany
    {
        return $this->hasMany(CollectorGroupComment::class, 'post_id');
    }

    public function reactions(): HasMany
    {
        return $this->hasMany(CollectorGroupPostReaction::class, 'post_id');
    }
}
