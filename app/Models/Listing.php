<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Listing extends Model
{
    protected $fillable = [

        'seller_id',

        'collection_item_id',

        'quantity',

        'price',

        'extra_description',

        'extra_images',

        'status',

        'marketplace_title',

        'marketplace_brand',

        'marketplace_category',

        'marketplace_images',

        'include_primary_item_image',

    ];

    protected function casts(): array
    {

        return [

            'quantity' => 'integer',

            'price' => 'decimal:2',

            'extra_images' => 'array',

            'marketplace_images' => 'array',

            'include_primary_item_image' => 'boolean',

        ];

    }

    public function seller(): BelongsTo
    {

        return $this->belongsTo(User::class, 'seller_id');

    }

    public function item(): BelongsTo
    {

        return $this->belongsTo(CollectionItem::class, 'collection_item_id');

    }

    public function chats(): HasMany
    {

        return $this->hasMany(Chat::class);

    }
}
