<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Chat extends Model
{
    protected $fillable = [
        'type',
        'listing_id',
        'buyer_id',
    ];

    public function listing(): BelongsTo
    {
        return $this->belongsTo(Listing::class);
    }

    public function participants(): HasMany
    {
        return $this->hasMany(ChatParticipant::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }
}
