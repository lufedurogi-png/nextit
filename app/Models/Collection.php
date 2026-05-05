<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Collection extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'accent_color',
        'cover_path',
        'category',
        'brand',
        'franchise_id',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(CollectionItem::class);
    }

    public function franchise(): BelongsTo
    {
        return $this->belongsTo(Franchise::class);
    }
}
