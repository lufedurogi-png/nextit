<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CollectorGroup extends Model
{
    protected $fillable = [
        'owner_id',
        'name',
        'description',
        'rules',
        'accent_color',
        'cover_path',
    ];

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function members(): HasMany
    {
        return $this->hasMany(CollectorGroupMember::class, 'group_id');
    }

    public function posts(): HasMany
    {
        return $this->hasMany(CollectorGroupPost::class, 'group_id');
    }

    public function bans(): HasMany
    {
        return $this->hasMany(CollectorGroupBan::class, 'group_id');
    }
}
