<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserFriendship;
use App\Models\UserNotification;
use Illuminate\Http\Request;

class FriendshipController extends Controller
{
    public function sendRequest(Request $request, User $user)
    {
        $me = (int) $request->user()->id;
        $target = (int) $user->id;
        abort_if($me === $target, 422, 'No puedes agregarte a ti mismo.');

        $existing = UserFriendship::query()
            ->where(function ($q) use ($me, $target) {
                $q->where('requester_id', $me)->where('addressee_id', $target);
            })
            ->orWhere(function ($q) use ($me, $target) {
                $q->where('requester_id', $target)->where('addressee_id', $me);
            })
            ->latest()
            ->first();

        if ($existing && $existing->status === 'accepted') {
            return response()->json(['message' => 'Ya son amigos.', 'status' => 'accepted'], 200);
        }
        if ($existing && $existing->status === 'pending') {
            return response()->json(['message' => 'La solicitud ya está pendiente.', 'status' => 'pending'], 200);
        }

        $friendship = UserFriendship::create([
            'requester_id' => $me,
            'addressee_id' => $target,
            'status' => 'pending',
            'responded_at' => null,
        ]);

        UserNotification::create([
            'user_id' => $target,
            'type' => 'friend_request',
            'message' => $request->user()->name.' te envió solicitud de amistad.',
            'payload' => ['friendship_id' => $friendship->id, 'requester_id' => $me],
            'read_at' => null,
        ]);

        return response()->json(['ok' => true, 'status' => 'pending'], 201);
    }

    public function respond(Request $request, UserFriendship $friendship)
    {
        $me = (int) $request->user()->id;
        abort_unless((int) $friendship->addressee_id === $me, 403);
        abort_if($friendship->status !== 'pending', 422, 'Esta solicitud ya fue respondida.');

        $data = $request->validate([
            'action' => ['required', 'string', 'in:accept,reject'],
        ]);

        $status = $data['action'] === 'accept' ? 'accepted' : 'rejected';
        $friendship->update([
            'status' => $status,
            'responded_at' => now(),
        ]);

        if ($status === 'accepted') {
            UserNotification::create([
                'user_id' => $friendship->requester_id,
                'type' => 'friend_accept',
                'message' => $request->user()->name.' aceptó tu solicitud de amistad.',
                'payload' => ['friendship_id' => $friendship->id, 'user_id' => $me],
                'read_at' => null,
            ]);
        }

        return response()->json(['ok' => true, 'status' => $status]);
    }

    public function myRequests(Request $request)
    {
        $me = (int) $request->user()->id;

        return response()->json([
            'incoming' => UserFriendship::query()
                ->where('addressee_id', $me)
                ->where('status', 'pending')
                ->with('requester:id,name,email,avatar_path')
                ->latest()
                ->get(),
            'outgoing' => UserFriendship::query()
                ->where('requester_id', $me)
                ->where('status', 'pending')
                ->with('addressee:id,name,email,avatar_path')
                ->latest()
                ->get(),
        ]);
    }

    public function friendsOfUser(Request $request, User $user)
    {
        $uid = (int) $user->id;
        $rows = UserFriendship::query()
            ->where('status', 'accepted')
            ->where(function ($q) use ($uid) {
                $q->where('requester_id', $uid)->orWhere('addressee_id', $uid);
            })
            ->with(['requester:id,name,email,avatar_path', 'addressee:id,name,email,avatar_path'])
            ->latest()
            ->get();

        $friends = $rows->map(function (UserFriendship $f) use ($uid) {
            return (int) $f->requester_id === $uid ? $f->addressee : $f->requester;
        })->filter()->values();

        return $friends;
    }

    public function statusWithUser(Request $request, User $user)
    {
        $me = (int) $request->user()->id;
        $target = (int) $user->id;
        if ($me === $target) {
            return response()->json(['status' => 'self']);
        }

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
            return response()->json(['status' => 'none']);
        }
        if ($f->status === 'accepted') {
            return response()->json(['status' => 'accepted']);
        }
        if ($f->status === 'pending' && (int) $f->requester_id === $me) {
            return response()->json(['status' => 'outgoing']);
        }
        if ($f->status === 'pending' && (int) $f->addressee_id === $me) {
            return response()->json(['status' => 'incoming', 'friendship_id' => $f->id]);
        }

        return response()->json(['status' => 'none']);
    }

    public function removeFriendship(Request $request, User $user)
    {
        $me = (int) $request->user()->id;
        $target = (int) $user->id;
        abort_if($me === $target, 422, 'No aplica para tu propio usuario.');

        $friendship = UserFriendship::query()
            ->where('status', 'accepted')
            ->where(function ($q) use ($me, $target) {
                $q->where(function ($qq) use ($me, $target) {
                    $qq->where('requester_id', $me)->where('addressee_id', $target);
                })->orWhere(function ($qq) use ($me, $target) {
                    $qq->where('requester_id', $target)->where('addressee_id', $me);
                });
            })
            ->latest()
            ->first();

        abort_if(! $friendship, 404, 'No existe una amistad activa.');

        $friendship->delete();

        return response()->json([
            'ok' => true,
            'status' => 'none',
            'message' => 'La amistad se eliminó correctamente.',
        ]);
    }
}
