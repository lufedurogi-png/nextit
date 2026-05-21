<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\ImageUploadRules;
use App\Models\CollectorGroup;
use App\Models\CollectorGroupBan;
use App\Models\CollectorGroupComment;
use App\Models\CollectorGroupCommentReaction;
use App\Models\CollectorGroupMember;
use App\Models\CollectorGroupPost;
use App\Models\CollectorGroupPostReaction;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class CollectorGroupController extends Controller
{
    public function index()
    {
        $userId = request()->user()->id;

        return CollectorGroup::query()
            ->with('owner:id,name,avatar_path')
            ->with([
                'members' => function ($query) use ($userId) {
                    $query->where('user_id', $userId);
                },
            ])
            ->withCount('members')
            ->latest()
            ->limit(60)
            ->get()
            ->map(function (CollectorGroup $group) {
                $membership = $group->members->first();
                $group->setAttribute('is_member', (bool) $membership);
                $group->setAttribute('my_role', $membership?->role);
                $group->unsetRelation('members');

                return $group;
            });
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:5000'],
            'rules' => ['nullable', 'string', 'max:5000'],
            'accent_color' => ['nullable', 'string', 'max:16'],
            'cover_path' => ['nullable', 'string', 'max:500'],
        ]);

        $group = CollectorGroup::create([
            ...$data,
            'owner_id' => $request->user()->id,
            'accent_color' => $data['accent_color'] ?? '#8b5cf6',
        ]);

        CollectorGroupMember::create([
            'group_id' => $group->id,
            'user_id' => $request->user()->id,
            'role' => 'owner',
            'can_post' => true,
            'can_comment' => true,
        ]);

        return response()->json($group->loadCount('members'), 201);
    }

    public function show(CollectorGroup $collector_group)
    {
        return $collector_group->load([
            'members.user:id,name,email,avatar_path',
            'posts' => function ($q) {
                $q->with([
                    'user:id,name,email,avatar_path',
                    'comments' => function ($cq) {
                        $cq->whereNull('parent_comment_id')
                            ->with([
                                'user:id,name,email,avatar_path',
                                'replies' => function ($rq) {
                                    $rq->with([
                                        'user:id,name,email,avatar_path',
                                        'replies' => function ($rrq) {
                                            $rrq->with('user:id,name,email,avatar_path')
                                                ->withCount([
                                                    'reactions as likes_count' => fn ($r) => $r->where('reaction', 'like'),
                                                    'reactions as dislikes_count' => fn ($r) => $r->where('reaction', 'dislike'),
                                                ]);
                                        },
                                    ])->withCount([
                                        'reactions as likes_count' => fn ($r) => $r->where('reaction', 'like'),
                                        'reactions as dislikes_count' => fn ($r) => $r->where('reaction', 'dislike'),
                                    ]);
                                },
                            ])->withCount([
                                'reactions as likes_count' => fn ($r) => $r->where('reaction', 'like'),
                                'reactions as dislikes_count' => fn ($r) => $r->where('reaction', 'dislike'),
                            ]);
                    },
                ])->withCount([
                    'reactions as likes_count' => fn ($r) => $r->where('reaction', 'like'),
                    'reactions as dislikes_count' => fn ($r) => $r->where('reaction', 'dislike'),
                ]);
            },
        ]);
    }

    public function update(Request $request, CollectorGroup $collector_group)
    {
        $member = $this->memberRole($request, $collector_group->id);
        abort_unless($member && in_array($member->role, ['owner', 'admin'], true), 403);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'description' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'rules' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'accent_color' => ['sometimes', 'nullable', 'string', 'max:16'],
            'cover_path' => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);

        $collector_group->update($data);

        return $collector_group->fresh()->loadCount('members');
    }

    public function destroy(Request $request, CollectorGroup $collector_group)
    {
        abort_unless($collector_group->owner_id === $request->user()->id, 403);
        $collector_group->delete();

        return response()->json(['ok' => true]);
    }

    public function join(Request $request, CollectorGroup $collector_group)
    {
        abort_if(
            CollectorGroupBan::query()
                ->where('group_id', $collector_group->id)
                ->where('user_id', $request->user()->id)
                ->exists(),
            403,
            'No puedes unirte a este grupo.'
        );

        $member = CollectorGroupMember::firstOrCreate(
            [
                'group_id' => $collector_group->id,
                'user_id' => $request->user()->id,
            ],
            [
                'role' => 'member',
                'can_post' => true,
                'can_comment' => true,
            ]
        );

        return response()->json($member->load('user:id,name,email,avatar_path'));
    }

    public function leave(Request $request, CollectorGroup $collector_group)
    {
        abort_if($collector_group->owner_id === $request->user()->id, 422, 'El owner no puede salir del grupo sin eliminarlo.');

        CollectorGroupMember::query()
            ->where('group_id', $collector_group->id)
            ->where('user_id', $request->user()->id)
            ->delete();

        return response()->json(['ok' => true]);
    }

    public function setMemberRole(Request $request, CollectorGroup $collector_group, CollectorGroupMember $member)
    {
        $actor = $this->memberRole($request, $collector_group->id);
        abort_unless($actor && in_array($actor->role, ['owner', 'admin'], true), 403);
        abort_if((int) $member->group_id !== (int) $collector_group->id, 404);

        $data = $request->validate([
            'role' => ['sometimes', 'string', 'in:member,admin'],
            'can_post' => ['sometimes', 'boolean'],
            'can_comment' => ['sometimes', 'boolean'],
        ]);

        abort_unless(
            array_key_exists('role', $data) || array_key_exists('can_post', $data) || array_key_exists('can_comment', $data),
            422,
            'Envía role y/o can_post / can_comment.'
        );

        if (array_key_exists('role', $data)) {
            abort_if($member->user_id === $collector_group->owner_id, 422, 'No puedes cambiar el rol del owner.');
            $member->role = $data['role'];
        }

        if (array_key_exists('can_post', $data)) {
            abort_if($member->user_id === $collector_group->owner_id, 422, 'No puedes desactivar publicaciones del owner.');
            $member->can_post = $data['can_post'];
        }

        if (array_key_exists('can_comment', $data)) {
            abort_if($member->user_id === $collector_group->owner_id, 422, 'No puedes desactivar comentarios del owner.');
            $member->can_comment = $data['can_comment'];
        }

        $member->save();

        return $member->fresh()->load('user:id,name,email,avatar_path');
    }

    public function removeMember(Request $request, CollectorGroup $collector_group, CollectorGroupMember $member)
    {
        $actor = $this->memberRole($request, $collector_group->id);
        abort_unless($actor && in_array($actor->role, ['owner', 'admin'], true), 403);
        abort_if((int) $member->group_id !== (int) $collector_group->id, 404);
        abort_if($member->user_id === $collector_group->owner_id, 422, 'No puedes expulsar al owner.');

        $opts = $request->validate([
            'ban' => ['sometimes', 'boolean'],
        ]);
        $ban = ($opts['ban'] ?? false) === true;

        $removedUserId = $member->user_id;
        $member->delete();

        if ($ban) {
            CollectorGroupBan::query()->firstOrCreate([
                'group_id' => $collector_group->id,
                'user_id' => $removedUserId,
            ]);
        }

        return response()->json(['ok' => true]);
    }

    public function storePost(Request $request, CollectorGroup $collector_group)
    {
        $this->assertMemberCanPost($request, $collector_group);

        $data = $request->validate([
            'body' => ['nullable', 'string', 'max:5000'],
            'images' => ['nullable', 'array', 'max:'.ImageUploadRules::MAX_GROUP_POST_IMAGES],
            'images.*' => ['string', 'max:500'],
        ]);

        $body = trim((string) ($data['body'] ?? ''));
        $images = $data['images'] ?? [];

        if ($body === '' && $images === []) {
            throw ValidationException::withMessages([
                'body' => ['Escribe un texto o adjunta al menos una imagen.'],
            ]);
        }

        $post = CollectorGroupPost::create([
            'group_id' => $collector_group->id,
            'user_id' => $request->user()->id,
            'body' => $body !== '' ? $body : ' ',
            'images' => $images !== [] ? $images : null,
        ]);

        return response()->json($post->load('user:id,name,email,avatar_path')->loadCount([
            'reactions as likes_count' => fn ($r) => $r->where('reaction', 'like'),
            'reactions as dislikes_count' => fn ($r) => $r->where('reaction', 'dislike'),
        ]), 201);
    }

    public function updatePost(Request $request, CollectorGroup $collector_group, CollectorGroupPost $post)
    {
        abort_if((int) $post->group_id !== (int) $collector_group->id, 404);
        $actor = $this->memberRole($request, $collector_group->id);
        abort_unless($actor, 403);
        $canModerate = in_array($actor->role, ['owner', 'admin'], true);
        abort_unless($post->user_id === $request->user()->id || $canModerate, 403);

        $data = $request->validate([
            'body' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'images' => ['sometimes', 'nullable', 'array', 'max:'.ImageUploadRules::MAX_GROUP_POST_IMAGES],
            'images.*' => ['string', 'max:500'],
        ]);

        $nextBody = array_key_exists('body', $data) ? trim((string) ($data['body'] ?? '')) : trim((string) $post->body);
        $nextImages = array_key_exists('images', $data) ? ($data['images'] ?? []) : ($post->images ?? []);

        if ($nextBody === '' && $nextImages === []) {
            throw ValidationException::withMessages([
                'body' => ['Debe quedar texto o al menos una imagen.'],
            ]);
        }

        $post->update([
            'body' => $nextBody !== '' ? $nextBody : ' ',
            'images' => $nextImages !== [] ? $nextImages : null,
        ]);

        return $post->fresh()
            ->load([
                'user:id,name,email,avatar_path',
                'comments' => function ($cq) {
                    $cq->whereNull('parent_comment_id')
                        ->with([
                            'user:id,name,email,avatar_path',
                            'replies' => function ($rq) {
                                $rq->with([
                                    'user:id,name,email,avatar_path',
                                    'replies' => function ($rrq) {
                                        $rrq->with('user:id,name,email,avatar_path')
                                            ->withCount([
                                                'reactions as likes_count' => fn ($r) => $r->where('reaction', 'like'),
                                                'reactions as dislikes_count' => fn ($r) => $r->where('reaction', 'dislike'),
                                            ]);
                                    },
                                ])->withCount([
                                    'reactions as likes_count' => fn ($r) => $r->where('reaction', 'like'),
                                    'reactions as dislikes_count' => fn ($r) => $r->where('reaction', 'dislike'),
                                ]);
                            },
                        ])->withCount([
                            'reactions as likes_count' => fn ($r) => $r->where('reaction', 'like'),
                            'reactions as dislikes_count' => fn ($r) => $r->where('reaction', 'dislike'),
                        ]);
                },
            ])
            ->loadCount([
                'reactions as likes_count' => fn ($r) => $r->where('reaction', 'like'),
                'reactions as dislikes_count' => fn ($r) => $r->where('reaction', 'dislike'),
            ]);
    }

    public function destroyPost(Request $request, CollectorGroup $collector_group, CollectorGroupPost $post)
    {
        abort_if((int) $post->group_id !== (int) $collector_group->id, 404);
        $actor = $this->memberRole($request, $collector_group->id);
        abort_unless($actor, 403);
        $canModerate = in_array($actor->role, ['owner', 'admin'], true);
        abort_unless($post->user_id === $request->user()->id || $canModerate, 403);

        $post->delete();

        return response()->json(['ok' => true]);
    }

    public function storeComment(Request $request, CollectorGroup $collector_group, CollectorGroupPost $post)
    {
        abort_if((int) $post->group_id !== (int) $collector_group->id, 404);
        $this->assertMemberCanComment($request, $collector_group);

        $data = $request->validate([
            'body' => ['nullable', 'string', 'max:3000', 'required_without:images'],
            'images' => ['nullable', 'array', 'max:'.ImageUploadRules::MAX_GROUP_COMMENT_IMAGES, 'required_without:body'],
            'images.*' => ['string', 'max:500'],
            'parent_comment_id' => ['nullable', 'integer', 'exists:collector_group_comments,id'],
        ]);

        $parentComment = null;
        if (array_key_exists('parent_comment_id', $data) && $data['parent_comment_id']) {
            $parentComment = CollectorGroupComment::query()->find($data['parent_comment_id']);
            abort_if(! $parentComment || (int) $parentComment->post_id !== (int) $post->id, 404);
            abort_if($this->commentDepth($parentComment) >= 2, 422, 'Solo se permiten hasta 3 niveles de comentarios.');
        }

        $comment = CollectorGroupComment::create([
            'post_id' => $post->id,
            'user_id' => $request->user()->id,
            'parent_comment_id' => $parentComment?->id,
            'body' => $data['body'] ?? '',
            'images' => $data['images'] ?? null,
        ]);

        return response()->json($comment->load(['user:id,name,email,avatar_path', 'parent.user:id,name,email,avatar_path'])->loadCount([
            'reactions as likes_count' => fn ($r) => $r->where('reaction', 'like'),
            'reactions as dislikes_count' => fn ($r) => $r->where('reaction', 'dislike'),
        ]), 201);
    }

    public function updateComment(Request $request, CollectorGroup $collector_group, CollectorGroupPost $post, CollectorGroupComment $comment)
    {
        abort_if((int) $post->group_id !== (int) $collector_group->id || (int) $comment->post_id !== (int) $post->id, 404);
        $actor = $this->memberRole($request, $collector_group->id);
        abort_unless($actor, 403);
        $canModerate = in_array($actor->role, ['owner', 'admin'], true);
        abort_unless((int) $comment->user_id === (int) $request->user()->id || $canModerate, 403);

        $data = $request->validate([
            'body' => ['nullable', 'string', 'max:3000', 'required_without:images'],
            'images' => ['nullable', 'array', 'max:'.ImageUploadRules::MAX_GROUP_COMMENT_IMAGES, 'required_without:body'],
            'images.*' => ['string', 'max:500'],
        ]);

        $comment->update([
            'body' => $data['body'] ?? '',
            'images' => array_key_exists('images', $data) ? $data['images'] : $comment->images,
        ]);

        return $comment->fresh()->load('user:id,name,email,avatar_path')->loadCount([
            'reactions as likes_count' => fn ($r) => $r->where('reaction', 'like'),
            'reactions as dislikes_count' => fn ($r) => $r->where('reaction', 'dislike'),
        ]);
    }

    public function reactPost(Request $request, CollectorGroup $collector_group, CollectorGroupPost $post)
    {
        abort_if((int) $post->group_id !== (int) $collector_group->id, 404);
        abort_unless($this->memberRole($request, $collector_group->id), 403);

        $data = $request->validate([
            'reaction' => ['required', 'string', 'in:like,dislike'],
        ]);

        CollectorGroupPostReaction::query()->updateOrCreate(
            [
                'post_id' => $post->id,
                'user_id' => $request->user()->id,
            ],
            [
                'reaction' => $data['reaction'],
            ]
        );

        return response()->json([
            'ok' => true,
            'likes_count' => CollectorGroupPostReaction::query()->where('post_id', $post->id)->where('reaction', 'like')->count(),
            'dislikes_count' => CollectorGroupPostReaction::query()->where('post_id', $post->id)->where('reaction', 'dislike')->count(),
        ]);
    }

    public function reactComment(Request $request, CollectorGroup $collector_group, CollectorGroupPost $post, CollectorGroupComment $comment)
    {
        abort_if((int) $post->group_id !== (int) $collector_group->id || (int) $comment->post_id !== (int) $post->id, 404);
        abort_unless($this->memberRole($request, $collector_group->id), 403);

        $data = $request->validate([
            'reaction' => ['required', 'string', 'in:like,dislike'],
        ]);

        CollectorGroupCommentReaction::query()->updateOrCreate(
            [
                'comment_id' => $comment->id,
                'user_id' => $request->user()->id,
            ],
            [
                'reaction' => $data['reaction'],
            ]
        );

        return response()->json([
            'ok' => true,
            'likes_count' => CollectorGroupCommentReaction::query()->where('comment_id', $comment->id)->where('reaction', 'like')->count(),
            'dislikes_count' => CollectorGroupCommentReaction::query()->where('comment_id', $comment->id)->where('reaction', 'dislike')->count(),
        ]);
    }

    public function destroyComment(Request $request, CollectorGroup $collector_group, CollectorGroupPost $post, CollectorGroupComment $comment)
    {
        abort_if((int) $post->group_id !== (int) $collector_group->id || (int) $comment->post_id !== (int) $post->id, 404);
        $actor = $this->memberRole($request, $collector_group->id);
        abort_unless($actor, 403);
        $canModerate = in_array($actor->role, ['owner', 'admin'], true);
        abort_unless($comment->user_id === $request->user()->id || $canModerate, 403);

        $idsToDelete = [$comment->id, ...$this->descendantCommentIds($comment)];
        CollectorGroupComment::query()->whereIn('id', $idsToDelete)->delete();

        return response()->json(['ok' => true]);
    }

    private function memberRole(Request $request, int $groupId): ?CollectorGroupMember
    {
        return CollectorGroupMember::query()
            ->where('group_id', $groupId)
            ->where('user_id', $request->user()->id)
            ->first();
    }

    private function assertMemberCanPost(Request $request, CollectorGroup $collector_group): void
    {
        if ((int) $collector_group->owner_id === (int) $request->user()->id) {
            return;
        }

        $member = $this->memberRole($request, $collector_group->id);
        abort_unless($member, 403);
        abort_if($member->can_post === false, 403, 'No puedes publicar en este grupo.');
    }

    private function assertMemberCanComment(Request $request, CollectorGroup $collector_group): void
    {
        if ((int) $collector_group->owner_id === (int) $request->user()->id) {
            return;
        }

        $member = $this->memberRole($request, $collector_group->id);
        abort_unless($member, 403);
        abort_if($member->can_comment === false, 403, 'No puedes comentar en este grupo.');
    }

    private function commentDepth(CollectorGroupComment $comment): int
    {
        $depth = 0;
        $cursor = $comment->parent;
        while ($cursor) {
            $depth++;
            $cursor = $cursor->parent;
        }

        return $depth;
    }

    private function descendantCommentIds(CollectorGroupComment $comment): array
    {
        $ids = [];
        $children = CollectorGroupComment::query()->where('parent_comment_id', $comment->id)->get(['id']);
        foreach ($children as $child) {
            $ids[] = (int) $child->id;
            $ids = [...$ids, ...$this->descendantCommentIds($child)];
        }

        return $ids;
    }
}
