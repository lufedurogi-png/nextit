<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('users') || Schema::hasColumn('users', 'revoked_permissions')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->json('revoked_permissions')->nullable()->after('extra_permissions');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('users') || ! Schema::hasColumn('users', 'revoked_permissions')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('revoked_permissions');
        });
    }
};
