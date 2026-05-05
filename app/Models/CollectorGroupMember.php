<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CollectorGroupMember extends Model
{
    protected $fillable = [
        'group_id',
        'user_id',
        'role',
        'can_post',
        'can_comment',
    ];

    protected $casts = [
        'can_post' => 'boolean',
        'can_comment' => 'boolean',
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
