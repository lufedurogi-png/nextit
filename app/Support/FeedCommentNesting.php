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
}
