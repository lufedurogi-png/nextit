<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('users', 'google_id')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('google_id', 191)->nullable()->after('email');
            });
        }

        Schema::table('users', function (Blueprint $table) {
            $table->string('password')->nullable()->change();
        });

        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'sqlsrv') {
            DB::statement("IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'users_google_id_unique' AND object_id = OBJECT_ID(N'users')) DROP INDEX users_google_id_unique ON users");
            DB::statement('CREATE UNIQUE NONCLUSTERED INDEX users_google_id_unique ON users (google_id) WHERE google_id IS NOT NULL');
        } else {
            Schema::table('users', function (Blueprint $table) {
                $table->unique('google_id');
            });
        }
    }

    public function down(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'sqlsrv') {
            DB::statement("IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'users_google_id_unique' AND object_id = OBJECT_ID(N'users')) DROP INDEX users_google_id_unique ON users");
        } else {
            Schema::table('users', function (Blueprint $table) {
                $table->dropUnique(['google_id']);
            });
        }

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('google_id');
            $table->string('password')->nullable(false)->change();
        });
    }
};
