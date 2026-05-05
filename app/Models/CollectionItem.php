<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CollectionItem extends Model
{
    protected $fillable = [
        'collection_id',
        'franchise_stamp_id',
        'title',
        'ref_number',
        'description',
        'quantity',
        'rarity_code',
        'image_path',
        'source',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
        ];
    }

    public function collection(): BelongsTo
    {
        return $this->belongsTo(Collection::class);
    }

    public function franchiseStamp(): BelongsTo
    {
        return $this->belongsTo(FranchiseStamp::class);
    }

    public function listings(): HasMany
    {
        return $this->hasMany(Listing::class);
    }
}
