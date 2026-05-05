<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Chat;
use App\Models\ChatParticipant;
use App\Models\Listing;
use App\Models\Message;
use App\Models\UserNotification;
use Illuminate\Http\Request;

class ChatController extends Controller
{
    public function index(Request $request)
    {
        $ids = ChatParticipant::query()
            ->where('user_id', $request->user()->id)
            ->pluck('chat_id');

        return Chat::query()
            ->whereIn('id', $ids)
            ->with(['listing.item', 'participants.user:id,name,email,avatar_path'])
            ->latest()
            ->get();
    }

    public function messages(Request $request, Chat $chat)
    {
        abort_unless(
            ChatParticipant::query()->where('chat_id', $chat->id)->where('user_id', $request->user()->id)->exists(),
            403
        );

        return $chat->messages()->with('user:id,name,email,avatar_path')->latest()->limit(200)->get()->reverse()->values();
    }

    public function send(Request $request, Chat $chat)
    {
        abort_unless(
            ChatParticipant::query()->where('chat_id', $chat->id)->where('user_id', $request->user()->id)->exists(),
            403
        );

        $data = $request->validate([
            'body' => ['nullable', 'string', 'max:5000'],
            'attachments' => ['nullable', 'array'],
            'attachments.*' => ['string', 'max:500'],
        ]);

        $message = $chat->messages()->create([
            'user_id' => $request->user()->id,
            'body' => $data['body'] ?? null,
            'attachments' => $data['attachments'] ?? null,
        ]);

        // Notificar a los demás participantes del chat cuando llega un mensaje nuevo.
        $recipientIds = ChatParticipant::query()
            ->where('chat_id', $chat->id)
            ->where('user_id', '!=', $request->user()->id)
            ->pluck('user_id')
            ->all();
        foreach ($recipientIds as $uid) {
            UserNotification::create([
                'user_id' => $uid,
                'type' => 'chat_message',
                'message' => $request->user()->name.' te envió un mensaje.',
                'payload' => [
                    'chat_id' => $chat->id,
                    'message_id' => $message->id,
                    'listing_id' => $chat->listing_id,
                ],
                'read_at' => null,
            ]);
        }

        return response()->json($message->load('user:id,name,email,avatar_path'), 201);
    }

    public function updateMessage(Request $request, Chat $chat, Message $message)
    {
        abort_unless(
            ChatParticipant::query()->where('chat_id', $chat->id)->where('user_id', $request->user()->id)->exists(),
            403
        );
        abort_if((int) $message->chat_id !== (int) $chat->id, 404);
        abort_unless((int) $message->user_id === (int) $request->user()->id, 403);

        $data = $request->validate([
            'body' => ['nullable', 'string', 'max:5000'],
            'attachments' => ['nullable', 'array'],
            'attachments.*' => ['string', 'max:500'],
        ]);

        $updates = [
            'body' => $data['body'] ?? null,
        ];
        // Si no vienen attachments en el PATCH, conservar los actuales.
        if (array_key_exists('attachments', $data)) {
            $updates['attachments'] = $data['attachments'];
        }

        $message->update($updates);

        return $message->fresh()->load('user:id,name,email,avatar_path');
    }

    public function destroyMessage(Request $request, Chat $chat, Message $message)
    {
        abort_unless(
            ChatParticipant::query()->where('chat_id', $chat->id)->where('user_id', $request->user()->id)->exists(),
            403
        );
        abort_if((int) $message->chat_id !== (int) $chat->id, 404);
        abort_unless((int) $message->user_id === (int) $request->user()->id, 403);
        $message->delete();

        return response()->json(['ok' => true]);
    }

    public function startForListing(Request $request, Listing $listing)
    {
        abort_if($listing->seller_id === $request->user()->id, 403, 'No puedes iniciar un chat de compra sobre tu propia publicación.');

        $chat = Chat::firstOrCreate(
            [
                'type' => 'sale',
                'listing_id' => $listing->id,
                'buyer_id' => $request->user()->id,
            ],
            []
        );

        foreach ([$request->user()->id, $listing->seller_id] as $userId) {
            ChatParticipant::firstOrCreate([
                'chat_id' => $chat->id,
                'user_id' => $userId,
            ]);
        }

        return response()->json($chat->load(['listing.item', 'participants.user:id,name,email,avatar_path']), 201);
    }

    /**
     * Abre o reutiliza un chat directo 1:1 con otro usuario.
     */
    public function startDirect(Request $request)
    {
        $data = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        $me = (int) $request->user()->id;
        $peer = (int) $data['user_id'];

        abort_if($peer === $me, 422, 'No puedes chatear contigo mismo.');

        $candidates = Chat::query()
            ->where('type', 'direct')
            ->whereNull('listing_id')
            ->whereNull('buyer_id')
            ->whereHas('participants', fn ($q) => $q->where('user_id', $me))
            ->with('participants')
            ->get();

        $chat = $candidates->first(function (Chat $c) use ($peer) {
            $ids = $c->participants->pluck('user_id');

            return $ids->count() === 2 && $ids->contains($peer);
        });

        $created = false;

        if (! $chat) {
            $chat = Chat::create([
                'type' => 'direct',
                'listing_id' => null,
                'buyer_id' => null,
            ]);

            foreach ([$me, $peer] as $userId) {
                ChatParticipant::firstOrCreate([
                    'chat_id' => $chat->id,
                    'user_id' => $userId,
                ]);
            }

            $created = true;
        }

        return response()->json(
            $chat->load(['listing.item', 'participants.user:id,name,email,avatar_path']),
            $created ? 201 : 200
        );
    }

    public function listingChats(Request $request, Listing $listing)
    {
        abort_unless((int) $listing->seller_id === (int) $request->user()->id, 403);

        $chats = Chat::query()
            ->where('type', 'sale')
            ->where('listing_id', $listing->id)
            ->with(['participants.user:id,name,email,avatar_path'])
            ->latest()
            ->get();

        return $chats->map(function (Chat $chat) {
            $last = $chat->messages()->with('user:id,name,email,avatar_path')->latest()->first();

            return [
                'id' => $chat->id,
                'type' => $chat->type,
                'listing_id' => $chat->listing_id,
                'buyer_id' => $chat->buyer_id,
                'participants' => $chat->participants,
                'last_message' => $last,
                'updated_at' => $chat->updated_at,
            ];
        })->values();
    }

    /**
     * Elimina el chat solo para el usuario autenticado.
     * Si quedan 0 participantes, también se borra el chat.
     */
    public function destroy(Request $request, Chat $chat)
    {
        $meId = (int) $request->user()->id;

        $ownsChat = ChatParticipant::query()
            ->where('chat_id', (int) $chat->id)
            ->where('user_id', $meId)
            ->exists();

        abort_unless($ownsChat, 403);

        ChatParticipant::query()
            ->where('chat_id', (int) $chat->id)
            ->where('user_id', $meId)
            ->delete();

        $stillHasParticipants = ChatParticipant::query()
            ->where('chat_id', (int) $chat->id)
            ->exists();

        if (! $stillHasParticipants) {
            $chat->messages()->delete();
            $chat->delete();
        }

        return response()->json(['ok' => true]);
    }
}
