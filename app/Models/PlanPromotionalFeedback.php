<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlanPromotionalFeedback extends Model
{
    /** Laravel infiere mal el plural de "Feedback" en algunos entornos (p. ej. SQL Server). */
    protected $table = 'plan_promotional_feedbacks';

    protected $fillable = [
        'user_id',
        'body',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
