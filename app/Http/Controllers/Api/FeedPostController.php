<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserFeedPost;
use App\Models\UserFeedPostReaction;
use App\Models\UserFriendship;
use App\Models\UserNotification;
use App\Support\FeedCommentNesting;
use App\Support\ImageUploadRules;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class FeedPostController extends Controller
{
    public function getTabPreference(Request $request)
    {
        $value = (int) ($request->user()->feed_tab_preference ?? 0);
        if ($value < 0 || $value > 3) {
            $value = 0;
        }

        return response()->json(['value' => $value]);
    }

    public function setTabPreference(Request $request)
    {
        $data = $request->validate([
            'value' => ['required', 'integer', 'min:0', 'max:3'],
        ]);

        $user = $request->user();
        $user->feed_tab_preference = (int) $data['value'];
        $user->save();

        return response()->json(['ok' => true, 'value' => (int) $user->feed_tab_preference]);
    }

    public function index(Request $request)
    {
        $me = (int) $request->user()->id;
        $friendIds = $this->friendIds($me);

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
            // "Para ti": publicaciones propias + publicaciones de amistades aceptadas.
            $authorIds = $friendIds->push($me)->unique()->values();
            $posts = $query
                ->whereIn('user_feed_posts.user_id', $authorIds)
                ->orderByDesc('user_feed_posts.created_at')
                ->orderByDesc('user_feed_posts.id')
                ->limit(80)
                ->get();

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

    private function friendIds(int $me): \Illuminate\Support\Collection
    {
        $friendships = UserFriendship::query()
            ->where('status', 'accepted')
            ->where(function ($q) use ($me) {
                $q->where('requester_id', $me)->orWhere('addressee_id', $me);
            })
            ->get(['requester_id', 'addressee_id']);

        return $friendships
            ->map(fn (UserFriendship $f) => (int) $f->requester_id === $me ? (int) $f->addressee_id : (int) $f->requester_id)
            ->filter(fn ($id) => $id > 0 && $id !== $me)
            ->unique()
            ->values();
    }

    public function store(Request $request)
    {
        $paths = [];
        $body = '';

        if ($request->allFiles()) {
            $request->validate(array_merge(
                ['body' => ['nullable', 'string', 'max:5000']],
                ImageUploadRules::feedPostFileRules()
            ));
            foreach ((array) $request->file('images', []) as $file) {
                if ($file && $file->isValid()) {
                    $paths[] = $file->store('feed-posts', 'public');
                }
            }
            $body = trim((string) $request->input('body', ''));
        } else {
            $data = $request->validate([
                'body' => ['nullable', 'string', 'max:5000'],
                'images' => ['nullable', 'array', 'max:'.ImageUploadRules::MAX_FEED_POST_IMAGES],
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
            $request->validate(array_merge(
                ['body' => ['nullable', 'string', 'max:5000']],
                ImageUploadRules::feedPostFileRules()
            ));
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
                'images' => ['sometimes', 'nullable', 'array', 'max:'.ImageUploadRules::MAX_FEED_POST_IMAGES],
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
