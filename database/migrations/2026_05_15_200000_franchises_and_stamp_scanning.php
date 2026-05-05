<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('franchises', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 80)->unique();
            $table->string('name');
            $table->string('description')->nullable();
            $table->timestamps();
        });

        Schema::create('franchise_stamps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('franchise_id')->constrained('franchises')->cascadeOnDelete();
            $table->string('player_name')->nullable();
            $table->string('country_code', 8)->nullable();
            $table->string('dob', 32)->nullable();
            $table->string('height', 32)->nullable();
            $table->string('weight', 32)->nullable();
            $table->string('stats_line', 160)->nullable();
            $table->string('club', 200)->nullable();
            $table->string('external_code', 80)->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();
            $table->index(['franchise_id', 'country_code']);
        });

        Schema::table('collections', function (Blueprint $table) {
            $table->foreignId('franchise_id')->nullable()->after('brand')->constrained('franchises')->nullOnDelete();
        });

        Schema::table('collection_items', function (Blueprint $table) {
            $table->foreignId('franchise_stamp_id')->nullable()->after('collection_id')->constrained('franchise_stamps')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('collection_items', function (Blueprint $table) {
            $table->dropConstrainedForeignId('franchise_stamp_id');
        });

        Schema::table('collections', function (Blueprint $table) {
            $table->dropConstrainedForeignId('franchise_id');
        });

        Schema::dropIfExists('franchise_stamps');
        Schema::dropIfExists('franchises');
    }
};
