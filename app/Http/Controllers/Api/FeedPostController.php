<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CollectorGroupMember;
use App\Models\User;
use App\Models\UserFeedPost;
use App\Models\UserFeedPostReaction;
use App\Models\UserFollow;
use App\Models\UserNotification;
use App\Models\UserSearchLog;
use App\Support\FeedCommentNesting;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class FeedPostController extends Controller
{
    public function index(Request $request)
    {
        $me = (int) $request->user()->id;
        $followedIds = UserFollow::query()
            ->where('follower_id', $me)
            ->pluck('followed_id')
            ->map(fn ($id) => (int) $id)
            ->values();

        $query = UserFeedPost::query()
            ->with([
                'user:id,name,email,avatar_path',
                'parent.user:id,name,email,avatar_path',
            ])
            ->withCount([
                'reactions as likes_count' => fn ($q) => $q->where('reaction', 'like'),
                'reactions as dislikes_count' => fn ($q) => $q->where('reaction', 'dislike'),
                'comments as comments_count',
                'shares as shares_count',
            ]);

        if ($request->query('tab') === 'for_you') {
            // Para "Para ti", traemos más candidatos y reordenamos por relevancia.
            $candidates = $query
                ->orderByDesc('user_feed_posts.created_at')
                ->orderByDesc('user_feed_posts.id')
                ->limit(180)
                ->get();

            $groupIds = CollectorGroupMember::query()
                ->where('user_id', $me)
                ->pluck('group_id');

            $groupMemberIds = CollectorGroupMember::query()
                ->whereIn('group_id', $groupIds)
                ->pluck('user_id')
                ->map(fn ($id) => (int) $id)
                ->values()
                ->all();

            $interestTerms = $this->interestTerms($me);

            $scored = $candidates->map(function (UserFeedPost $post) use ($me, $followedIds, $groupMemberIds, $interestTerms) {
                $score = 0;
                $authorId = (int) $post->user_id;
                if ($authorId === $me) {
                    $score += 18;
                }
                if ($followedIds->contains($authorId)) {
                    $score += 28;
                }
                if (in_array($authorId, $groupMemberIds, true)) {
                    $score += 12;
                }

                $body = mb_strtolower((string) $post->body);
                foreach ($interestTerms as $term) {
                    if (str_contains($body, $term)) {
                        $score += 9;
                    }
                }

                $score += (int) ($post->likes_count ?? 0) * 2;
                $score += (int) ($post->comments_count ?? 0) * 2;
                $score += (int) ($post->shares_count ?? 0) * 3;

                return ['score' => $score, 'post' => $post];
            })->sortByDesc(function ($row) {
                return sprintf(
                    '%08d-%s',
                    (int) $row['score'],
                    optional($row['post']->created_at)->format('U.u') ?? '0'
                );
            })->values();

            $posts = $scored->pluck('post')->take(50)->values();
            FeedCommentNesting::attachToPosts($posts);

            return $posts;
        }

        // SQL Server no permite reutilizar aliases de withCount (likes_count, etc.)
        // dentro del mismo SELECT para el score; eso rompía /feed en Inicio.
        // Orden simple y estable para mostrar el feed global correctamente.
        $posts = $query
            ->orderByDesc('user_feed_posts.created_at')
            ->orderByDesc('user_feed_posts.id')
            ->limit(50)
            ->get();

        FeedCommentNesting::attachToPosts($posts);

        return $posts;
    }

    private function interestTerms(int $userId): array
    {
        $logs = UserSearchLog::query()
            ->where('user_id', $userId)
            ->latest()
            ->limit(30)
            ->get(['query', 'hits']);

        $terms = [];
        foreach ($logs as $log) {
            $parts = preg_split('/[^a-z0-9]+/i', mb_strtolower((string) $log->query)) ?: [];
            foreach ($parts as $part) {
                $word = trim($part);
                if (mb_strlen($word) < 3) {
                    continue;
                }
                $terms[$word] = ($terms[$word] ?? 0) + max(1, (int) $log->hits);
            }
        }

        arsort($terms);

        return array_slice(array_keys($terms), 0, 8);
    }

    public function store(Request $request)
    {
        $paths = [];
        $body = '';

        if ($request->allFiles()) {
            $request->validate([
                'body' => ['nullable', 'string', 'max:5000'],
                'images' => ['sometimes', 'array', 'max:8'],
                'images.*' => ['file', 'max:10240', 'mimes:jpeg,png,jpg,gif,webp'],
            ]);
            foreach ((array) $request->file('images', []) as $file) {
                if ($file && $file->isValid()) {
                    $paths[] = $file->store('feed-posts', 'public');
                }
            }
            $body = trim((string) $request->input('body', ''));
        } else {
            $data = $request->validate([
                'body' => ['nullable', 'string', 'max:5000'],
                'images' => ['nullable', 'array', 'max:8'],
                'images.*' => ['string', 'max:500'],
            ]);
            $body = trim((string) ($data['body'] ?? ''));
            $paths = $data['images'] ?? [];
        }

        if ($body === '' && $paths === []) {
            throw ValidationException::withMessages([
                'body' => ['Escribe un texto o adjunta al menos una imagen.'],
            ]);
        }

        $post = $request->user()->feedPosts()->create([
            'body' => $body !== '' ? $body : ' ',
            'images' => $paths !== [] ? $paths : null,
        ]);

        return response()->json($post->load('user:id,name,email,avatar_path'), 201);
    }

    public function update(Request $request, UserFeedPost $userFeedPost)
    {
        abort_if((int) $userFeedPost->user_id !== (int) $request->user()->id, 403);

        $paths = null;
        $body = null;

        if ($request->allFiles()) {
            $request->validate([
                'body' => ['nullable', 'string', 'max:5000'],
                'images' => ['sometimes', 'array', 'max:8'],
                'images.*' => ['file', 'max:10240', 'mimes:jpeg,png,jpg,gif,webp'],
            ]);
            $newPaths = [];
            foreach ((array) $request->file('images', []) as $file) {
                if ($file && $file->isValid()) {
                    $newPaths[] = $file->store('feed-posts', 'public');
                }
            }
            if ($newPaths !== []) {
                $existing = $userFeedPost->images ?? [];
                $paths = array_values(array_merge($existing, $newPaths));
            }
            $body = trim((string) $request->input('body', ''));
        } else {
            $data = $request->validate([
                'body' => ['sometimes', 'string', 'max:5000'],
                'images' => ['sometimes', 'nullable', 'array', 'max:8'],
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
            if ($body === '' && ($paths === null || $paths === [])) {
                $hasImages = $userFeedPost->images && count($userFeedPost->images) > 0;
                if (! $hasImages) {
                    throw ValidationException::withMessages([
                        'body' => ['La publicación no puede quedar vacía.'],
                    ]);
                }
            }
            $userFeedPost->body = $body !== '' ? $body : ' ';
        }

        if ($paths !== null) {
            $userFeedPost->images = $paths;
        }

        $userFeedPost->edited_at = now();
        $userFeedPost->save();

        return $userFeedPost->fresh()->load('user:id,name,email,avatar_path');
    }

    public function destroy(Request $request, UserFeedPost $userFeedPost)
    {
        abort_if((int) $userFeedPost->user_id !== (int) $request->user()->id, 403);

        $userFeedPost->delete();

        return response()->json(['ok' => true]);
    }

    public function react(Request $request, UserFeedPost $userFeedPost)
    {
        $data = $request->validate([
            'reaction' => ['required', 'string', 'in:like,dislike'],
        ]);

        UserFeedPostReaction::query()->updateOrCreate(
            [
                'post_id' => $userFeedPost->id,
                'user_id' => $request->user()->id,
            ],
            [
                'reaction' => $data['reaction'],
            ]
        );

        if ($userFeedPost->user_id !== $request->user()->id) {
            UserNotification::create([
                'user_id' => $userFeedPost->user_id,
                'type' => 'reaction',
                'message' => $request->user()->name.' reaccionó a tu publicación.',
                'payload' => ['post_id' => $userFeedPost->id, 'reaction' => $data['reaction']],
            ]);
        }

        $likesCount = UserFeedPostReaction::query()
            ->where('post_id', $userFeedPost->id)
            ->where('reaction', 'like')
            ->count();
        $dislikesCount = UserFeedPostReaction::query()
            ->where('post_id', $userFeedPost->id)
            ->where('reaction', 'dislike')
            ->count();

        return response()->json([
            'ok' => true,
            'likes_count' => $likesCount,
            'dislikes_count' => $dislikesCount,
        ]);
    }

    public function highlights()
    {
        $recentUsers = User::query()
            ->with(['collections:id,user_id,name'])
            ->latest()
            ->limit(8)
            ->get(['id', 'name', 'email', 'avatar_path', 'created_at'])
            ->map(function (User $user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'avatar_path' => $user->avatar_path,
                    'joined_at' => $user->created_at,
                    'collections' => $user->collections->pluck('name')->take(3)->values(),
                ];
            })
            ->values();

        $missingPosts = UserFeedPost::query()
            ->where(function ($q) {
                $q->where('body', 'like', '%faltante%')
                    ->orWhere('body', 'like', '%me falta%')
                    ->orWhere('body', 'like', '%busco%')
                    ->orWhere('body', 'like', '%necesito%');
            })
            ->with('user:id,name,email,avatar_path')
            ->latest()
            ->limit(10)
            ->get();

        FeedCommentNesting::attachToPosts($missingPosts);

        return response()->json([
            'recent_users' => $recentUsers,
            'missing_posts' => $missingPosts,
        ]);
    }
}
