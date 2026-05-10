<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Collection;
use App\Models\User;
use Carbon\CarbonInterface;
use App\Models\UserFeedPost;
use App\Models\UserFriendship;
use App\Support\FeedCommentNesting;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    public function update(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'ui_theme' => ['sometimes', 'integer', 'min:1', 'max:10'],
            'viku_chan_mode' => ['sometimes', 'integer', 'in:0,1'],
        ]);

        if (array_key_exists('viku_chan_mode', $data)) {
            $end = $user->pro_subscription_ends_at;
            $proActive = $end instanceof CarbonInterface && $end->isFuture();
            if (! $proActive) {
                return response()->json([
                    'message' => 'Modo Viku chan solo está disponible con plan Pro Coleccionista activo.',
                ], 422);
            }
            $user->viku_chan_mode = (int) $data['viku_chan_mode'];
            unset($data['viku_chan_mode']);
        }

        if ($data !== []) {
            $user->fill($data);
        }

        if ($request->hasFile('avatar')) {
            $request->validate([
                'avatar' => ['file', 'max:10240'],
            ]);
            $path = $request->file('avatar')->store('avatars', 'public');
            $user->avatar_path = $path;
        }

        if ($request->hasFile('cover')) {
            $request->validate([
                'cover' => ['file', 'max:15360'],
            ]);
            $path = $request->file('cover')->store('covers', 'public');
            $user->cover_path = $path;
        }

        $user->save();

        return $user->fresh();
    }

    /**
     * Subida de avatar/portada vía POST (multipart + POST evita problemas con PATCH en algunos clientes/servidores).
     */
    public function uploadMedia(Request $request)
    {
        $user = $request->user();

        if (! $request->hasFile('avatar') && ! $request->hasFile('cover')) {
            abort(422, 'Debes enviar el archivo avatar o cover.');
        }

        if ($request->hasFile('avatar')) {
            $request->validate([
                'avatar' => ['file', 'max:10240'],
            ]);
            $user->avatar_path = $request->file('avatar')->store('avatars', 'public');
        }

        if ($request->hasFile('cover')) {
            $request->validate([
                'cover' => ['file', 'max:15360'],
            ]);
            $user->cover_path = $request->file('cover')->store('covers', 'public');
        }

        $user->save();

        return $user->fresh();
    }

    public function feedPosts(Request $request)
    {
        $posts = UserFeedPost::query()
            ->where('user_id', $request->user()->id)
            ->with([
                'user:id,name,email,avatar_path',
                'parent.user:id,name,email,avatar_path',
            ])
            ->withCount([
                'reactions as likes_count' => fn ($q) => $q->where('reaction', 'like'),
                'reactions as dislikes_count' => fn ($q) => $q->where('reaction', 'dislike'),
                'comments as comments_count',
            ])
            ->latest()
            ->limit(50)
            ->get();

        FeedCommentNesting::attachToPosts($posts);

        return $posts;
    }

    public function show(Request $request, User $user)
    {
        $me = (int) $request->user()->id;
        $target = (int) $user->id;

        $collectionsCount = Collection::query()->where('user_id', $target)->count();
        $postsCount = UserFeedPost::query()->where('user_id', $target)->count();

        $friendStatus = 'self';
        $friendshipId = null;
        if ($me !== $target) {
            $f = UserFriendship::query()
                ->where(function ($q) use ($me, $target) {
                    $q->where('requester_id', $me)->where('addressee_id', $target);
                })
                ->orWhere(function ($q) use ($me, $target) {
                    $q->where('requester_id', $target)->where('addressee_id', $me);
                })
                ->latest()
                ->first();

            if (! $f) {
                $friendStatus = 'none';
            } elseif ($f->status === 'accepted') {
                $friendStatus = 'accepted';
            } elseif ($f->status === 'pending' && (int) $f->requester_id === $me) {
                $friendStatus = 'outgoing';
            } elseif ($f->status === 'pending' && (int) $f->addressee_id === $me) {
                $friendStatus = 'incoming';
                $friendshipId = $f->id;
            } else {
                $friendStatus = 'none';
            }
        }

        return response()->json([
            'user' => $user->only(['id', 'name', 'email', 'avatar_path', 'cover_path']),
            'collections_count' => $collectionsCount,
            'posts_count' => $postsCount,
            'friend_status' => $friendStatus,
            'friendship_id' => $friendshipId,
        ]);
    }

    public function feedPostsByUser(Request $request, User $user)
    {
        $posts = UserFeedPost::query()
            ->where('user_id', $user->id)
            ->with([
                'user:id,name,email,avatar_path',
                'parent.user:id,name,email,avatar_path',
            ])
            ->withCount([
                'reactions as likes_count' => fn ($q) => $q->where('reaction', 'like'),
                'reactions as dislikes_count' => fn ($q) => $q->where('reaction', 'dislike'),
                'comments as comments_count',
            ])
            ->latest()
            ->limit(50)
            ->get();

        FeedCommentNesting::attachToPosts($posts);

        return $posts;
    }
}
