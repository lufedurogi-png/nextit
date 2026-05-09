<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Descripciones largas del catálogo JSON (lista de equipos, notas) superan VARCHAR(255).
     */
    public function up(): void
    {
        Schema::table('franchises', function (Blueprint $table) {
            $table->text('description')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('franchises', function (Blueprint $table) {
            $table->string('description')->nullable()->change();
        });
    }
};
