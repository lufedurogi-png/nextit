<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_friendships', function (Blueprint $table) {
            $table->id();
            // En SQL Server, cascada doble a users puede causar "multiple cascade paths".
            $table->foreignId('requester_id')->constrained('users')->noActionOnDelete();
            $table->foreignId('addressee_id')->constrained('users')->noActionOnDelete();
            $table->string('status', 20)->default('pending'); // pending|accepted|rejected
            $table->timestamp('responded_at')->nullable();
            $table->timestamps();

            $table->unique(['requester_id', 'addressee_id']);
            $table->index(['requester_id', 'status']);
            $table->index(['addressee_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_friendships');
    }
};
