<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Franchise extends Model
{
    protected $fillable = [
        'slug',
        'name',
        'description',
    ];

    public function stamps(): HasMany
    {
        return $this->hasMany(FranchiseStamp::class);
    }

    public function collections(): HasMany
    {
        return $this->hasMany(Collection::class);
    }
}
