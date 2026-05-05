<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CollectorGroup;
use App\Models\CollectorGroupPost;
use App\Models\Listing;
use App\Models\User;
use App\Models\UserFeedPost;
use App\Models\UserFeedPostComment;
use App\Models\UserFeedPostCommentReaction;
use App\Models\UserFollow;
use App\Models\UserNotification;
use App\Models\UserSavedPost;
use App\Models\UserSearchLog;
use App\Support\FeedCommentNesting;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class SocialController extends Controller
{
    public function addComment(Request $request, UserFeedPost $userFeedPost)
    {
        $paths = [];
        $body = '';
        $parentId = null;

        if ($request->allFiles()) {
            $request->validate([
                'body' => ['nullable', 'string', 'max:3000'],
                'parent_comment_id' => ['nullable', 'integer'],
                'images' => ['sometimes', 'array', 'max:6'],
                'images.*' => ['file', 'max:10240', 'mimes:jpeg,png,jpg,gif,webp'],
            ]);
            foreach ((array) $request->file('images', []) as $file) {
                if ($file && $file->isValid()) {
                    $paths[] = $file->store('feed-comments', 'public');
                }
            }
            $body = trim((string) $request->input('body', ''));
            $parentId = $request->input('parent_comment_id');
        } else {
            $data = $request->validate([
                'body' => ['nullable', 'string', 'max:3000'],
                'parent_comment_id' => ['nullable', 'integer'],
                'images' => ['nullable', 'array', 'max:6'],
                'images.*' => ['string', 'max:500'],
            ]);
            $body = trim((string) ($data['body'] ?? ''));
            $paths = $data['images'] ?? [];
            $parentId = $data['parent_comment_id'] ?? null;
        }

        if ($body === '' && $paths === []) {
            throw ValidationException::withMessages([
                'body' => ['Escribe texto o adjunta al menos una imagen.'],
            ]);
        }

        if ($parentId) {
            $parent = UserFeedPostComment::query()->findOrFail((int) $parentId);
            abort_if((int) $parent->post_id !== (int) $userFeedPost->id, 422, 'El comentario no pertenece a esta publicación.');
            if ($this->commentLevelsBelowPost($parent) >= 3) {
                throw ValidationException::withMessages([
                    'parent_comment_id' => ['Solo se permiten hasta 3 niveles: publicación → comentario → respuesta.'],
                ]);
            }
        }

        $comment = UserFeedPostComment::create([
            'post_id' => $userFeedPost->id,
            'user_id' => $request->user()->id,
            'parent_comment_id' => $parentId ? (int) $parentId : null,
            'body' => $body !== '' ? $body : ' ',
            'images' => $paths !== [] ? $paths : null,
        ]);

        if ((int) $userFeedPost->user_id !== (int) $request->user()->id) {
            $this->notify(
                $userFeedPost->user_id,
                'comment',
                $request->user()->name.' comentó tu publicación.',
                ['post_id' => $userFeedPost->id, 'comment_id' => $comment->id]
            );
        }

        if ($parentId) {
            $parent = UserFeedPostComment::query()->find((int) $parentId);
            if ($parent && (int) $parent->user_id !== (int) $request->user()->id) {
                $this->notify(
                    $parent->user_id,
                    'comment_reply',
                    $request->user()->name.' respondió a tu comentario.',
                    ['post_id' => $userFeedPost->id, 'comment_id' => $comment->id, 'parent_comment_id' => (int) $parentId]
                );
            }
        }

        return response()->json(
            $comment->load('user:id,name,email,avatar_path')
                ->loadCount([
                    'commentReactions as likes_count' => fn ($q) => $q->where('reaction', 'like'),
                    'commentReactions as dislikes_count' => fn ($q) => $q->where('reaction', 'dislike'),
                ]),
            201
        );
    }

    public function updateComment(Request $request, UserFeedPostComment $comment)
    {
        abort_if((int) $comment->user_id !== (int) $request->user()->id, 403);

        $paths = null;
        $body = null;

        if ($request->allFiles()) {
            $request->validate([
                'body' => ['nullable', 'string', 'max:3000'],
                'images' => ['sometimes', 'array', 'max:6'],
                'images.*' => ['file', 'max:10240', 'mimes:jpeg,png,jpg,gif,webp'],
            ]);
            $newPaths = [];
            foreach ((array) $request->file('images', []) as $file) {
                if ($file && $file->isValid()) {
                    $newPaths[] = $file->store('feed-comments', 'public');
                }
            }
            if ($newPaths !== []) {
                $existing = $comment->images ?? [];
                $paths = array_values(array_merge($existing, $newPaths));
            }
            $body = trim((string) $request->input('body', ''));
        } else {
            $data = $request->validate([
                'body' => ['sometimes', 'string', 'max:3000'],
                'images' => ['sometimes', 'nullable', 'array', 'max:6'],
                'images.*' => ['string', 'max:500'],
            ]);
            if (array_key_exists('body', $data)) {
                $body = trim($data['body']);
            }
            if (array_key_exists('images', $data)) {
                $paths = $data['images'];
            }
        }

        if ($body !== null) {
            if ($body === '' && ($paths === null || $paths === []) && (! $comment->images || count($comment->images) === 0)) {
                throw ValidationException::withMessages([
                    'body' => ['El comentario no puede quedar vacío.'],
                ]);
            }
            $comment->body = $body !== '' ? $body : ' ';
        }

        if ($paths !== null) {
            $comment->images = $paths;
        }

        $comment->edited_at = now();
        $comment->save();

        return $comment->fresh()->load('user:id,name,email,avatar_path')->loadCount([
            'commentReactions as likes_count' => fn ($q) => $q->where('reaction', 'like'),
            'commentReactions as dislikes_count' => fn ($q) => $q->where('reaction', 'dislike'),
        ]);
    }

    public function destroyComment(Request $request, UserFeedPostComment $comment)
    {
        abort_if((int) $comment->user_id !== (int) $request->user()->id, 403);

        $postId = (int) $comment->post_id;
        $all = UserFeedPostComment::query()->where('post_id', $postId)->get(['id', 'parent_comment_id']);
        $childrenByParent = $all->groupBy(fn ($c) => (int) ($c->parent_comment_id ?? 0));

        $order = [];
        $walk = function (int $id) use (&$walk, $childrenByParent, &$order) {
            foreach ($childrenByParent->get($id, collect()) as $ch) {
                $walk((int) $ch->id);
            }
            $order[] = $id;
        };
        $walk((int) $comment->id);

        foreach ($order as $id) {
            UserFeedPostComment::query()->where('id', $id)->delete();
        }

        return response()->json(['ok' => true]);
    }

    public function reactComment(Request $request, UserFeedPostComment $comment)
    {
        $data = $request->validate([
            'reaction' => ['required', 'string', 'in:like,dislike'],
        ]);

        UserFeedPostCommentReaction::query()->updateOrCreate(
            [
                'comment_id' => $comment->id,
                'user_id' => $request->user()->id,
            ],
            [
                'reaction' => $data['reaction'],
            ]
        );

        if ((int) $comment->user_id !== (int) $request->user()->id) {
            $post = $comment->post;
            if ($post) {
                $this->notify(
                    $comment->user_id,
                    'comment_reaction',
                    $request->user()->name.' reaccionó a tu comentario.',
                    ['post_id' => $post->id, 'comment_id' => $comment->id, 'reaction' => $data['reaction']]
                );
            }
        }

        $likesCount = UserFeedPostCommentReaction::query()
            ->where('comment_id', $comment->id)
            ->where('reaction', 'like')
            ->count();
        $dislikesCount = UserFeedPostCommentReaction::query()
            ->where('comment_id', $comment->id)
            ->where('reaction', 'dislike')
            ->count();

        return response()->json([
            'ok' => true,
            'likes_count' => $likesCount,
            'dislikes_count' => $dislikesCount,
        ]);
    }

    public function savePost(Request $request, UserFeedPost $userFeedPost)
    {
        UserSavedPost::firstOrCreate([
            'user_id' => $request->user()->id,
            'post_id' => $userFeedPost->id,
        ]);

        return response()->json(['ok' => true]);
    }

    public function unsavePost(Request $request, UserFeedPost $userFeedPost)
    {
        UserSavedPost::query()
            ->where('user_id', $request->user()->id)
            ->where('post_id', $userFeedPost->id)
            ->delete();

        return response()->json(['ok' => true]);
    }

    public function savedPosts(Request $request)
    {
        $rows = UserSavedPost::query()
            ->where('user_id', $request->user()->id)
            ->with([
                'post' => function ($q) {
                    $q->with(['user:id,name,email,avatar_path', 'parent.user:id,name,email,avatar_path'])
                        ->withCount([
                            'reactions as likes_count' => fn ($q2) => $q2->where('reaction', 'like'),
                            'reactions as dislikes_count' => fn ($q2) => $q2->where('reaction', 'dislike'),
                            'comments as comments_count',
                        ]);
                },
            ])
            ->latest()
            ->get();

        $posts = $rows->pluck('post')->filter()->values();

        FeedCommentNesting::attachToPosts($posts);

        return $posts;
    }

    public function sharePost(Request $request, UserFeedPost $userFeedPost)
    {
        $data = $request->validate([
            'body' => ['nullable', 'string', 'max:1000'],
        ]);

        $shared = UserFeedPost::create([
            'user_id' => $request->user()->id,
            'parent_post_id' => $userFeedPost->id,
            'body' => $data['body'] ?? ('Compartió una publicación de '.($userFeedPost->user->name ?? 'otro coleccionista')),
            'images' => null,
        ]);

        $this->notify(
            $userFeedPost->user_id,
            'share',
            $request->user()->name.' compartió tu publicación.',
            ['post_id' => $userFeedPost->id, 'shared_post_id' => $shared->id]
        );

        return response()->json($shared->load('user:id,name,email,avatar_path'), 201);
    }

    public function follow(Request $request, User $user)
    {
        abort_if($user->id === $request->user()->id, 422, 'No puedes seguirte a ti mismo.');

        UserFollow::firstOrCreate([
            'follower_id' => $request->user()->id,
            'followed_id' => $user->id,
        ]);

        $this->notify($user->id, 'follow', $request->user()->name.' empezó a seguirte.', ['user_id' => $request->user()->id]);

        return response()->json(['ok' => true]);
    }

    public function unfollow(Request $request, User $user)
    {
        UserFollow::query()
            ->where('follower_id', $request->user()->id)
            ->where('followed_id', $user->id)
            ->delete();

        return response()->json(['ok' => true]);
    }

    public function notifications(Request $request)
    {
        return UserNotification::query()
            ->where('user_id', $request->user()->id)
            ->latest()
            ->limit(50)
            ->get();
    }

    public function markNotificationsRead(Request $request)
    {
        UserNotification::query()
            ->where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['ok' => true]);
    }

    public function markNotificationRead(Request $request, UserNotification $notification)
    {
        abort_if((int) $notification->user_id !== (int) $request->user()->id, 403);
        if (! $notification->read_at) {
            $notification->read_at = now();
            $notification->save();
        }

        return response()->json(['ok' => true]);
    }

    public function discovery(Request $request)
    {
        $me = $request->user()->id;

        $trendingCollections = User::query()
            ->withCount('collections')
            ->orderByDesc('collections_count')
            ->limit(6)
            ->get(['id', 'name', 'avatar_path'])
            ->map(fn (User $u) => [
                'user_id' => $u->id,
                'name' => $u->name,
                'avatar_path' => $u->avatar_path,
                'collections_count' => $u->collections_count,
            ]);

        $recommendedUsers = User::query()
            ->where('id', '!=', $me)
            ->whereNotIn('id', UserFollow::query()->where('follower_id', $me)->pluck('followed_id'))
            ->latest()
            ->limit(8)
            ->get(['id', 'name', 'email', 'avatar_path']);

        $recommendedGroups = CollectorGroup::query()
            ->withCount('members')
            ->latest()
            ->limit(8)
            ->get(['id', 'name', 'cover_path', 'accent_color']);

        return response()->json([
            'trending_collections' => $trendingCollections,
            'recommended_users' => $recommendedUsers,
            'recommended_groups' => $recommendedGroups,
        ]);
    }

    public function globalSearch(Request $request)
    {
        $q = trim((string) $request->query('q', ''));
        if (strlen($q) < 2) {
            return response()->json([
                'users' => [],
                'groups' => [],
                'posts' => [],
                'group_posts' => [],
                'listings' => [],
            ]);
        }

        $this->registerSearchLog((int) $request->user()->id, $q, 'global');

        $users = User::query()
            ->where('id', '!=', $request->user()->id)
            ->where(function ($query) use ($q) {
                $query->where('name', 'like', '%'.$q.'%')
                    ->orWhere('email', 'like', '%'.$q.'%');
            })
            ->limit(10)
            ->get(['id', 'name', 'email', 'avatar_path', 'cover_path']);

        $groups = CollectorGroup::query()
            ->where('name', 'like', '%'.$q.'%')
            ->withCount('members')
            ->limit(10)
            ->get(['id', 'name', 'description', 'cover_path', 'accent_color']);

        $posts = UserFeedPost::query()
            ->where('body', 'like', '%'.$q.'%')
            ->with(['user:id,name,email,avatar_path', 'parent.user:id,name,email,avatar_path'])
            ->withCount([
                'reactions as likes_count' => fn ($q2) => $q2->where('reaction', 'like'),
                'reactions as dislikes_count' => fn ($q2) => $q2->where('reaction', 'dislike'),
                'comments as comments_count',
            ])
            ->latest()
            ->limit(10)
            ->get(['id', 'user_id', 'parent_post_id', 'body', 'images', 'edited_at', 'created_at']);

        FeedCommentNesting::attachToPosts($posts);

        $groupPosts = CollectorGroupPost::query()
            ->where('body', 'like', '%'.$q.'%')
            ->with([
                'user:id,name,email,avatar_path',
                'group:id,name,cover_path,accent_color',
            ])
            ->withCount([
                'reactions as likes_count' => fn ($q2) => $q2->where('reaction', 'like'),
                'reactions as dislikes_count' => fn ($q2) => $q2->where('reaction', 'dislike'),
                'comments as comments_count',
            ])
            ->latest()
            ->limit(10)
            ->get(['id', 'group_id', 'user_id', 'body', 'images', 'created_at']);

        $listings = Listing::query()
            ->where('status', 'active')
            ->where(function ($query) use ($q) {
                $query->where('marketplace_title', 'like', '%'.$q.'%')
                    ->orWhere('marketplace_brand', 'like', '%'.$q.'%')
                    ->orWhere('marketplace_category', 'like', '%'.$q.'%')
                    ->orWhere('extra_description', 'like', '%'.$q.'%')
                    ->orWhereHas('item', function ($q2) use ($q) {
                        $q2->where('title', 'like', '%'.$q.'%')
                            ->orWhere('description', 'like', '%'.$q.'%')
                            ->orWhereHas('collection', function ($q3) use ($q) {
                                $q3->where('name', 'like', '%'.$q.'%')
                                    ->orWhere('category', 'like', '%'.$q.'%')
                                    ->orWhere('brand', 'like', '%'.$q.'%');
                            });
                    });
            })
            ->with(['seller:id,name,email,avatar_path', 'item.collection'])
            ->latest()
            ->limit(12)
            ->get();

        return response()->json([
            'users' => $users,
            'groups' => $groups,
            'posts' => $posts,
            'group_posts' => $groupPosts,
            'listings' => $listings,
        ]);
    }

    /**
     * Nivel 1 = comentario directo a la publicación; 2 = respuesta; 3 = respuesta a respuesta (máximo).
     */
    private function commentLevelsBelowPost(UserFeedPostComment $comment): int
    {
        if (! $comment->parent_comment_id) {
            return 1;
        }

        $parent = UserFeedPostComment::query()->find((int) $comment->parent_comment_id);
        if (! $parent) {
            return 1;
        }

        return 1 + $this->commentLevelsBelowPost($parent);
    }

    private function notify(int $userId, string $type, string $message, array $payload = []): void
    {
        if ($userId <= 0) {
            return;
        }
        UserNotification::create([
            'user_id' => $userId,
            'type' => $type,
            'message' => $message,
            'payload' => $payload === [] ? null : $payload,
            'read_at' => null,
        ]);
    }

    private function registerSearchLog(int $userId, string $query, string $context): void
    {
        $normalized = trim(mb_strtolower($query));
        if ($normalized === '' || mb_strlen($normalized) < 2) {
            return;
        }

        $existing = UserSearchLog::query()
            ->where('user_id', $userId)
            ->where('context', $context)
            ->where('query', $normalized)
            ->latest()
            ->first();

        if ($existing) {
            $existing->increment('hits');
            $existing->touch();

            return;
        }

        UserSearchLog::create([
            'user_id' => $userId,
            'query' => $normalized,
            'context' => $context,
            'hits' => 1,
        ]);
    }
}
