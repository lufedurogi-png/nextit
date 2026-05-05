<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_feed_posts', function (Blueprint $table) {
            $table->unsignedBigInteger('parent_post_id')->nullable()->after('user_id');
            $table->foreign('parent_post_id')->references('id')->on('user_feed_posts')->noActionOnDelete();
        });

        Schema::create('user_feed_post_comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('post_id')->constrained('user_feed_posts')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->noActionOnDelete();
            $table->text('body');
            $table->timestamps();
        });

        Schema::create('user_saved_posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->noActionOnDelete();
            $table->foreignId('post_id')->constrained('user_feed_posts')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['user_id', 'post_id']);
        });

        Schema::create('user_follows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('follower_id')->constrained('users')->noActionOnDelete();
            $table->foreignId('followed_id')->constrained('users')->noActionOnDelete();
            $table->timestamps();
            $table->unique(['follower_id', 'followed_id']);
        });

        Schema::create('user_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->noActionOnDelete();
            $table->string('type', 40);
            $table->text('message');
            $table->json('payload')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_notifications');
        Schema::dropIfExists('user_follows');
        Schema::dropIfExists('user_saved_posts');
        Schema::dropIfExists('user_feed_post_comments');
        Schema::table('user_feed_posts', function (Blueprint $table) {
            $table->dropForeign(['parent_post_id']);
            $table->dropColumn('parent_post_id');
        });
    }
};
