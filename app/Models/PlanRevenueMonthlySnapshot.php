<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PlanRevenueMonthlySnapshot extends Model
{
    protected $fillable = [
        'year',
        'month',
        'payload',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
        ];
    }
}
