<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('scanner_enabled')->default(true)->after('pro_last_payment_reference');
        });

        Schema::create('scan_usage_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('collection_id')->constrained('collections')->cascadeOnDelete();
            $table->foreignId('franchise_stamp_id')->nullable()->constrained('franchise_stamps')->nullOnDelete();
            $table->timestamps();

            $table->index(['created_at', 'id']);
            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('scan_usage_events');

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('scanner_enabled');
        });
    }
};
