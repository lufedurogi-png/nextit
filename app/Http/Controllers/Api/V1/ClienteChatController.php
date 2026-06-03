<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ClienteVentasMensaje;
use App\Support\ChatChannel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class ClienteChatController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $channel = ChatChannel::normalize($request->query('channel'));
        $afterId = max(0, (int) $request->query('after_id', 0));

        $query = ChatChannel::applyChannelFilter(
            ClienteVentasMensaje::where('user_id', Auth::id()),
            $channel
        )->with(['seller:id,name,email'])
            ->orderBy('created_at');

        if ($afterId > 0) {
            $query->where('id', '>', $afterId);
        }

        $mensajes = $query->get()->map(fn (ClienteVentasMensaje $m) => $this->mapMensaje($m, $channel));

        return response()->json(['success' => true, 'data' => $mensajes]);
    }

    public function store(Request $request): JsonResponse
    {
        $rules = [
            'body' => 'required|string|max:5000',
        ];
        if (ChatChannel::columnExists()) {
            $rules['channel'] = ['required', 'string', Rule::in(ChatChannel::all())];
        } else {
            $rules['channel'] = ['nullable', 'string', Rule::in(ChatChannel::all())];
        }

        $validated = $request->validate($rules);

        $channel = ChatChannel::columnExists()
            ? ChatChannel::normalize($validated['channel'])
            : ChatChannel::normalize($validated['channel'] ?? ChatChannel::ADMIN);

        $payload = [
            'user_id' => Auth::id(),
            'sender_type' => 'customer',
            'seller_id' => null,
            'body' => $validated['body'],
        ];
        if (ChatChannel::columnExists()) {
            $payload['channel'] = $channel;
        }
        $mensaje = ClienteVentasMensaje::create($payload);
        $mensaje->refresh();

        return response()->json([
            'success' => true,
            'data' => $this->mapMensaje($mensaje->load('seller'), $channel),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $mensaje = ClienteVentasMensaje::where('user_id', Auth::id())
            ->where('id', $id)
            ->where('sender_type', 'customer')
            ->firstOrFail();

        $request->validate(['body' => 'required|string|max:5000']);
        $mensaje->update(['body' => $request->input('body')]);

        return response()->json([
            'success' => true,
            'data' => $this->mapMensaje($mensaje->fresh('seller'), $mensaje->channel),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $mensaje = ClienteVentasMensaje::where('user_id', Auth::id())
            ->where('id', $id)
            ->where('sender_type', 'customer')
            ->firstOrFail();

        $mensaje->delete();

        return response()->json(['success' => true]);
    }

    private function mapMensaje(ClienteVentasMensaje $m, string $channel): array
    {
        $senderType = $m->sender_type;
        if ($channel === ChatChannel::ADMIN && $senderType === 'seller') {
            $senderType = 'admin';
        }

        $storedChannel = ChatChannel::columnExists() && filled($m->channel)
            ? ChatChannel::normalize((string) $m->channel)
            : $channel;

        $arr = [
            'id' => $m->id,
            'channel' => $storedChannel,
            'sender_type' => $senderType,
            'body' => $m->body,
            'created_at' => $m->created_at->toIso8601String(),
            'updated_at' => $m->updated_at->toIso8601String(),
        ];

        if ($m->seller_id && $m->relationLoaded('seller') && $m->seller) {
            if ($channel === ChatChannel::VENTAS) {
                $arr['seller_name'] = $m->seller->name;
                $arr['seller_email'] = $m->seller->email;
            } else {
                $arr['admin_name'] = $m->seller->name;
                $arr['admin_email'] = $m->seller->email;
                $arr['seller_name'] = $m->seller->name;
                $arr['seller_email'] = $m->seller->email;
            }
        }

        return $arr;
    }
}
