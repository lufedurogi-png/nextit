<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Cada llamada exitosa a Vision puede no producir match; igual cuenta para uso/costo.
     */
    public function up(): void
    {
        Schema::table('scan_usage_events', function (Blueprint $table) {
            $table->unsignedBigInteger('franchise_stamp_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('scan_usage_events', function (Blueprint $table) {
            $table->unsignedBigInteger('franchise_stamp_id')->nullable(false)->change();
        });
    }
};
