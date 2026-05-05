<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('plan_settings')) {
            return;
        }

        if (! Schema::hasColumn('plan_settings', 'pro_features')) {
            Schema::table('plan_settings', function (Blueprint $table) {
                $table->json('pro_features')->nullable()->after('billing_period_days');
            });
        }

        DB::table('plan_settings')->whereNull('pro_features')->update([
            'pro_features' => json_encode([]),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        if (! Schema::hasTable('plan_settings') || ! Schema::hasColumn('plan_settings', 'pro_features')) {
            return;
        }

        Schema::table('plan_settings', function (Blueprint $table) {
            $table->dropColumn('pro_features');
        });
    }
};
