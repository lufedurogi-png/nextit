<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_feed_posts', function (Blueprint $table) {
            $table->timestamp('edited_at')->nullable()->after('updated_at');
        });

        Schema::table('user_feed_post_comments', function (Blueprint $table) {
            $table->unsignedBigInteger('parent_comment_id')->nullable()->after('user_id');
            $table->json('images')->nullable()->after('body');
            $table->timestamp('edited_at')->nullable()->after('updated_at');
        });

        Schema::table('user_feed_post_comments', function (Blueprint $table) {
            $table->foreign('parent_comment_id')
                ->references('id')
                ->on('user_feed_post_comments')
                ->noActionOnDelete();
        });

        Schema::create('user_feed_post_comment_reactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('comment_id')->constrained('user_feed_post_comments')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->noActionOnDelete();
            $table->string('reaction', 16);
            $table->timestamps();
            $table->unique(['comment_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_feed_post_comment_reactions');

        Schema::table('user_feed_post_comments', function (Blueprint $table) {
            $table->dropForeign(['parent_comment_id']);
            $table->dropColumn(['parent_comment_id', 'images', 'edited_at']);
        });

        Schema::table('user_feed_posts', function (Blueprint $table) {
            $table->dropColumn('edited_at');
        });
    }
};
