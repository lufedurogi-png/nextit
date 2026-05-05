<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('users')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'pro_subscription_started_at')) {
                $after = Schema::hasColumn('users', 'revoked_permissions') ? 'revoked_permissions' : 'remember_token';
                $table->timestamp('pro_subscription_started_at')->nullable()->after($after);
            }
            if (! Schema::hasColumn('users', 'pro_subscription_ends_at')) {
                $table->timestamp('pro_subscription_ends_at')->nullable();
            }
            if (! Schema::hasColumn('users', 'pro_subscription_cancelled')) {
                $table->boolean('pro_subscription_cancelled')->default(false);
            }
            if (! Schema::hasColumn('users', 'pro_last_payment_method')) {
                $table->string('pro_last_payment_method', 32)->nullable();
            }
            if (! Schema::hasColumn('users', 'pro_last_payment_reference')) {
                $table->string('pro_last_payment_reference', 120)->nullable();
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('users')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $cols = [
                'pro_subscription_started_at',
                'pro_subscription_ends_at',
                'pro_subscription_cancelled',
                'pro_last_payment_method',
                'pro_last_payment_reference',
            ];
            foreach ($cols as $col) {
                if (Schema::hasColumn('users', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
