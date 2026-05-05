<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('collector_group_comments') || Schema::hasColumn('collector_group_comments', 'images')) {
            return;
        }

        Schema::table('collector_group_comments', function (Blueprint $table) {
            $table->json('images')->nullable();
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('collector_group_comments') || ! Schema::hasColumn('collector_group_comments', 'images')) {
            return;
        }

        Schema::table('collector_group_comments', function (Blueprint $table) {
            $table->dropColumn('images');
        });
    }
};
