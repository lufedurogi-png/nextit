<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'scanner_enabled')) {
                $table->boolean('scanner_enabled')->default(true)->after('pro_last_payment_reference');
            }
        });

        if (! Schema::hasTable('scan_usage_events')) {
            Schema::create('scan_usage_events', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('collection_id')->constrained('collections')->cascadeOnDelete();
                // Esta FK se agrega en una migracion posterior, cuando franchise_stamps ya existe.
                $table->foreignId('franchise_stamp_id')->nullable();
                $table->timestamps();

                $table->index(['created_at', 'id']);
                $table->index(['user_id', 'created_at']);
                $table->index('franchise_stamp_id');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('scan_usage_events');

        if (Schema::hasColumn('users', 'scanner_enabled')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('scanner_enabled');
            });
        }
    }
};
