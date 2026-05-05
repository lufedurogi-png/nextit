<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('users') || Schema::hasColumn('users', 'extra_permissions')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->text('extra_permissions')->nullable()->after('role');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('users') || ! Schema::hasColumn('users', 'extra_permissions')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('extra_permissions');
        });
    }
};
