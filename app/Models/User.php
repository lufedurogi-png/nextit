<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable([
    'name', 'email', 'avatar_path', 'cover_path', 'ui_theme', 'password', 'role', 'extra_permissions', 'revoked_permissions',
    'pro_subscription_started_at', 'pro_subscription_ends_at', 'pro_subscription_cancelled',
    'pro_last_payment_method', 'pro_last_payment_reference',
    'scanner_enabled',
])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'extra_permissions' => 'array',
            'revoked_permissions' => 'array',
            'pro_subscription_started_at' => 'datetime',
            'pro_subscription_ends_at' => 'datetime',
            'pro_subscription_cancelled' => 'bool',
            'scanner_enabled' => 'bool',
        ];
    }

    public function collections(): HasMany
    {
        return $this->hasMany(Collection::class);
    }

    public function feedPosts(): HasMany
    {
        return $this->hasMany(UserFeedPost::class);
    }

    public function ownedGroups(): HasMany
    {
        return $this->hasMany(CollectorGroup::class, 'owner_id');
    }

    public function followers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_follows', 'followed_id', 'follower_id');
    }

    public function following(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_follows', 'follower_id', 'followed_id');
    }

    public function notificationsFeed(): HasMany
    {
        return $this->hasMany(UserNotification::class);
    }

    public function stories(): HasMany
    {
        return $this->hasMany(UserStory::class);
    }

    public function searchLogs(): HasMany
    {
        return $this->hasMany(UserSearchLog::class);
    }

    public function scanUsageEvents(): HasMany
    {
        return $this->hasMany(ScanUsageEvent::class);
    }
}
