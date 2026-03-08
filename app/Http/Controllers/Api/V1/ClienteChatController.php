<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ClienteVentasMensaje;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ClienteChatController extends Controller
{
    public function index(): JsonResponse
    {
        $mensajes = ClienteVentasMensaje::where('user_id', Auth::id())
            ->with(['seller:id,name,email'])
            ->orderBy('created_at')
            ->get()
            ->map(fn (ClienteVentasMensaje $m) => $this->mapMensaje($m));

        return response()->json(['success' => true, 'data' => $mensajes]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate(['body' => 'required|string|max:5000']);

        $mensaje = ClienteVentasMensaje::create([
            'user_id' => Auth::id(),
            'sender_type' => 'customer',
            'seller_id' => null,
            'body' => $request->input('body'),
        ]);

        return response()->json([
            'success' => true,
            'data' => $this->mapMensaje($mensaje),
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
            'data' => $this->mapMensaje($mensaje->fresh('seller')),
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

    private function mapMensaje(ClienteVentasMensaje $m): array
    {
        $arr = [
            'id' => $m->id,
            'sender_type' => $m->sender_type,
            'body' => $m->body,
            'created_at' => $m->created_at->toIso8601String(),
            'updated_at' => $m->updated_at->toIso8601String(),
        ];
        if ($m->seller_id && $m->relationLoaded('seller') && $m->seller) {
            $arr['seller_name'] = $m->seller->name;
            $arr['seller_email'] = $m->seller->email;
        }
        return $arr;
    }
}
