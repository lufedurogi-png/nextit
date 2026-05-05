<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserFriendship;
use App\Models\UserStory;
use Illuminate\Http\Request;

class StoryController extends Controller
{
    public function index(Request $request)
    {
        $me = (int) $request->user()->id;
        $friendIds = UserFriendship::query()
            ->where('status', 'accepted')
            ->where(function ($q) use ($me) {
                $q->where('requester_id', $me)->orWhere('addressee_id', $me);
            })
            ->get(['requester_id', 'addressee_id'])
            ->map(function ($row) use ($me) {
                return (int) $row->requester_id === $me ? (int) $row->addressee_id : (int) $row->requester_id;
            })
            ->filter(fn ($id) => $id > 0)
            ->unique()
            ->values();
        $allowedUserIds = $friendIds->prepend($me)->values()->all();

        $stories = UserStory::query()
            ->whereIn('user_id', $allowedUserIds)
            ->where('expires_at', '>', now())
            ->with('user:id,name,avatar_path')
            ->orderByDesc('created_at')
            ->get();

        $grouped = $stories
            ->groupBy('user_id')
            ->map(function ($rows) {
                $first = $rows->first();

                return [
                    'user' => $first?->user?->only(['id', 'name', 'avatar_path']),
                    'latest_at' => optional($rows->first())->created_at,
                    'stories' => $rows->map(function (UserStory $story) {
                        return [
                            'id' => $story->id,
                            'image_path' => $story->image_path,
                            'text_overlay' => $story->text_overlay,
                            'created_at' => $story->created_at,
                            'expires_at' => $story->expires_at,
                        ];
                    })->values(),
                ];
            })
            ->values()
            ->sortByDesc(fn ($g) => optional($g['latest_at'])->timestamp ?? 0)
            ->values();

        // Mueve mis historias al inicio del carrusel.
        $mine = $grouped->first(fn ($g) => (int) ($g['user']['id'] ?? 0) === $me);
        if ($mine) {
            $grouped = collect([$mine])
                ->concat($grouped->filter(fn ($g) => (int) ($g['user']['id'] ?? 0) !== $me)->values())
                ->values();
        }

        return $grouped;
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'image_path' => ['required', 'string', 'max:500'],
            'text_overlay' => ['nullable', 'string', 'max:500'],
        ]);

        $story = UserStory::create([
            'user_id' => $request->user()->id,
            'image_path' => $data['image_path'],
            'text_overlay' => isset($data['text_overlay']) ? trim((string) $data['text_overlay']) : null,
            'expires_at' => now()->addDay(),
        ]);

        return response()->json($story->load('user:id,name,avatar_path'), 201);
    }

    public function show(Request $request, UserStory $story)
    {
        $me = (int) $request->user()->id;
        $isOwner = (int) $story->user_id === $me;
        $isActive = $story->expires_at && $story->expires_at->isFuture();
        $isFriend = UserFriendship::query()
            ->where('status', 'accepted')
            ->where(function ($q) use ($me, $story) {
                $q->where(function ($qq) use ($me, $story) {
                    $qq->where('requester_id', $me)->where('addressee_id', (int) $story->user_id);
                })->orWhere(function ($qq) use ($me, $story) {
                    $qq->where('requester_id', (int) $story->user_id)->where('addressee_id', $me);
                });
            })
            ->exists();

        // Solo dueño o amigos (y activa, salvo dueño).
        abort_unless($isOwner || ($isActive && $isFriend), 404);

        $siblings = UserStory::query()
            ->where('user_id', $story->user_id)
            ->where('expires_at', '>', now())
            ->orderByDesc('created_at')
            ->get(['id', 'image_path', 'text_overlay', 'created_at', 'expires_at']);

        return response()->json([
            'story' => $story->load('user:id,name,avatar_path'),
            'is_owner' => $isOwner,
            'siblings' => $siblings,
        ]);
    }

    public function update(Request $request, UserStory $story)
    {
        abort_if((int) $story->user_id !== (int) $request->user()->id, 403);

        $validated = $request->validate([
            'image_path' => ['sometimes', 'nullable', 'string', 'max:500'],
            'text_overlay' => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);

        if (array_key_exists('image_path', $validated) && $validated['image_path'] !== null && $validated['image_path'] !== '') {
            $story->image_path = $validated['image_path'];
        }
        if (array_key_exists('text_overlay', $validated)) {
            $raw = $validated['text_overlay'];
            $story->text_overlay = $raw !== null ? trim((string) $raw) : null;
            if ($story->text_overlay === '') {
                $story->text_overlay = null;
            }
        }

        $story->expires_at = now()->addDay();
        $story->save();

        return response()->json($story->fresh()->load('user:id,name,avatar_path'));
    }

    public function destroy(Request $request, UserStory $story)
    {
        abort_if((int) $story->user_id !== (int) $request->user()->id, 403);
        $story->delete();

        return response()->json(['ok' => true]);
    }
}
