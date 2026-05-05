<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plan_settings', function (Blueprint $table) {
            $table->id();
            $table->decimal('pro_price', 10, 2)->default(99);
            $table->string('pro_currency', 3)->default('MXN');
            $table->unsignedSmallInteger('billing_period_days')->default(30);
            $table->timestamps();
        });

        DB::table('plan_settings')->insert([
            'pro_price' => 99,
            'pro_currency' => 'MXN',
            'billing_period_days' => 30,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('plan_settings');
    }
};
