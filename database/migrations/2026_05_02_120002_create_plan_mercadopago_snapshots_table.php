<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plan_mercadopago_snapshots', function (Blueprint $table) {
            $table->string('preference_id', 64)->primary();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->json('snapshot');
            $table->timestamp('expires_at');
            $table->timestamp('applied_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'expires_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plan_mercadopago_snapshots');
    }
};
