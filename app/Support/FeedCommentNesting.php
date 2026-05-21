<?php

namespace App\Support;

use App\Models\UserFeedPost;
use App\Models\UserFeedPostComment;
use Illuminate\Support\Collection;

class FeedCommentNesting
{
    /**
     * @param  Collection<int, UserFeedPost>  $posts
     */
    public static function attachToPosts(Collection $posts): void
    {
        if ($posts->isEmpty()) {
            return;
        }

        $ids = $posts->pluck('id');
        $flat = UserFeedPostComment::query()
            ->whereIn('post_id', $ids)
            ->with([
                'user:id,name,email,avatar_path',
                'parentComment.user:id,name,email,avatar_path',
            ])
            ->withCount([
                'commentReactions as likes_count' => fn ($q) => $q->where('reaction', 'like'),
                'commentReactions as dislikes_count' => fn ($q) => $q->where('reaction', 'dislike'),
            ])
            ->orderBy('id')
            ->get()
            ->groupBy('post_id');

        foreach ($posts as $post) {
            $items = $flat->get($post->id, collect());
            $post->setRelation('comments', self::nest(collect($items)));
        }
    }

    /**
     * @param  Collection<int, UserFeedPostComment>  $items
     * @return Collection<int, UserFeedPostComment>
     */
    public static function nest(Collection $items): Collection
    {
        if ($items->isEmpty()) {
            return collect();
        }

        $byParent = $items->groupBy(fn ($c) => (int) ($c->parent_comment_id ?? 0));

        $build = function (int $parentKey) use (&$build, $byParent) {
            return $byParent->get($parentKey, collect())->map(function ($c) use (&$build) {
                $c->setRelation('replies', $build((int) $c->id));

                return $c;
            })->values();
        };

        return $build(0);
    }

    /** Borra todos los comentarios de un post (hijos antes que padres por FK parent_comment_id). */
    public static function deleteAllForPost(int $postId): void
    {
        $all = UserFeedPostComment::query()
            ->where('post_id', $postId)
            ->get(['id', 'parent_comment_id']);

        if ($all->isEmpty()) {
            return;
        }

        $childrenByParent = $all->groupBy(fn ($c) => (int) ($c->parent_comment_id ?? 0));
        $order = [];

        $walk = function (int $id) use (&$walk, $childrenByParent, &$order) {
            foreach ($childrenByParent->get($id, collect()) as $ch) {
                $walk((int) $ch->id);
            }
            $order[] = $id;
        };

        foreach ($childrenByParent->get(0, collect()) as $root) {
            $walk((int) $root->id);
        }

        foreach ($order as $id) {
            UserFeedPostComment::query()->where('id', $id)->delete();
        }
    }
}
