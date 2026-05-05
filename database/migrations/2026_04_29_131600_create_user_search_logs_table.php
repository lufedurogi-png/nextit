<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_search_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('query', 255);
            $table->string('context', 40)->default('global');
            $table->unsignedInteger('hits')->default(1);
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index(['context']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_search_logs');
    }
};
