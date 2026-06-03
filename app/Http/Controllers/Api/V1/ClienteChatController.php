<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ClienteVentasMensaje;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Schema;

class ClienteChatController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $afterId = max(0, (int) $request->query('after_id', 0));

        $query = $this->adminMessagesQuery(Auth::id())
            ->with(['seller:id,name,email'])
            ->orderBy('created_at');

        if ($afterId > 0) {
            $query->where('id', '>', $afterId);
        }

        $mensajes = $query->get()->map(fn (ClienteVentasMensaje $m) => $this->mapMensaje($m));

        return response()->json(['success' => true, 'data' => $mensajes]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'body' => 'required|string|max:5000',
        ]);

        $payload = [
            'user_id' => Auth::id(),
            'sender_type' => 'customer',
            'seller_id' => null,
            'body' => $validated['body'],
        ];
        if ($this->hasChannelColumn()) {
            $payload['channel'] = 'admin';
        }

        $mensaje = ClienteVentasMensaje::create($payload);

        return response()->json([
            'success' => true,
            'data' => $this->mapMensaje($mensaje->load('seller')),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $mensaje = $this->adminMessagesQuery(Auth::id())
            ->where('id', $id)
            ->where('sender_type', 'customer')
            ->firstOrFail();

        $request->validate(['body' => 'required|string|max:5000']);
        $mensaje->update(['body' => $request->input('body')]);

        return response()->json([
            'success' => true,
            'data' => $this->mapMensaje($mensaje->fresh('seller')),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $mensaje = $this->adminMessagesQuery(Auth::id())
            ->where('id', $id)
            ->where('sender_type', 'customer')
            ->firstOrFail();

        $mensaje->delete();

        return response()->json(['success' => true]);
    }

    /** @return \Illuminate\Database\Eloquent\Builder<ClienteVentasMensaje> */
    private function adminMessagesQuery(int $userId)
    {
        $query = ClienteVentasMensaje::where('user_id', $userId);

        if ($this->hasChannelColumn()) {
            $query->where(function ($q) {
                $q->where('channel', 'admin')->orWhereNull('channel');
            });
        }

        return $query;
    }

    private function hasChannelColumn(): bool
    {
        return Schema::hasTable('cliente_ventas_mensajes')
            && Schema::hasColumn('cliente_ventas_mensajes', 'channel');
    }

    private function mapMensaje(ClienteVentasMensaje $m): array
    {
        $senderType = $m->sender_type === 'seller' ? 'admin' : $m->sender_type;

        $arr = [
            'id' => $m->id,
            'channel' => 'admin',
            'sender_type' => $senderType,
            'body' => $m->body,
            'created_at' => $m->created_at->toIso8601String(),
            'updated_at' => $m->updated_at->toIso8601String(),
        ];

        if ($m->seller_id && $m->relationLoaded('seller') && $m->seller) {
            $arr['admin_name'] = $m->seller->name;
            $arr['admin_email'] = $m->seller->email;
        }

        return $arr;
    }
}
