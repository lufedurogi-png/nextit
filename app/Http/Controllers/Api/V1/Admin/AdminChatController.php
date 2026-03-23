<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\ClienteVentasMensaje;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AdminChatController extends Controller
{
    public function indexClientes(): JsonResponse
    {
        $clientesConMensajes = ClienteVentasMensaje::query()
            ->select('user_id')
            ->groupBy('user_id')
            ->pluck('user_id');

        if ($clientesConMensajes->isEmpty()) {
            return response()->json(['success' => true, 'data' => []]);
        }

        $users = User::whereIn('id', $clientesConMensajes)
            ->get(['id', 'name', 'email']);

        $sinContestar = $this->getMensajesSinContestarPorCliente($clientesConMensajes->toArray());

        $data = $users->map(function (User $u) use ($sinContestar) {
            return [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'unanswered_count' => $sinContestar[$u->id] ?? 0,
            ];
        })->sortByDesc(fn ($c) => $c['unanswered_count'])->values()->all();

        return response()->json(['success' => true, 'data' => $data]);
    }

    public function show(int $userId): JsonResponse
    {
        $mensajes = ClienteVentasMensaje::where('user_id', $userId)
            ->with(['user:id,name,email', 'seller:id,name,email'])
            ->orderBy('created_at')
            ->get()
            ->map(fn (ClienteVentasMensaje $m) => $this->mapMensaje($m));

        $cliente = User::find($userId, ['id', 'name', 'email']);
        if (!$cliente) {
            return response()->json(['success' => false, 'message' => 'Cliente no encontrado'], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'cliente' => ['id' => $cliente->id, 'name' => $cliente->name, 'email' => $cliente->email],
                'mensajes' => $mensajes,
            ],
        ]);
    }

    public function store(Request $request, int $userId): JsonResponse
    {
        $request->validate(['body' => 'required|string|max:5000']);

        $cliente = User::find($userId);
        if (!$cliente) {
            return response()->json(['success' => false, 'message' => 'Cliente no encontrado'], 404);
        }

        $mensaje = ClienteVentasMensaje::create([
            'user_id' => $userId,
            'sender_type' => 'admin',
            'seller_id' => Auth::id(),
            'body' => $request->input('body'),
        ]);

        return response()->json([
            'success' => true,
            'data' => $this->mapMensaje($mensaje->load(['user', 'seller'])),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $mensaje = ClienteVentasMensaje::where('id', $id)
            ->whereIn('sender_type', ['admin', 'seller'])
            ->where('seller_id', Auth::id())
            ->firstOrFail();

        $request->validate(['body' => 'required|string|max:5000']);
        $mensaje->update(['body' => $request->input('body')]);

        return response()->json([
            'success' => true,
            'data' => $this->mapMensaje($mensaje->fresh(['user', 'seller'])),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $mensaje = ClienteVentasMensaje::where('id', $id)
            ->whereIn('sender_type', ['admin', 'seller'])
            ->where('seller_id', Auth::id())
            ->firstOrFail();

        $mensaje->delete();
        return response()->json(['success' => true]);
    }

    private function getMensajesSinContestarPorCliente(array $userIds): array
    {
        $mensajes = ClienteVentasMensaje::whereIn('user_id', $userIds)
            ->orderBy('user_id')
            ->orderByDesc('created_at')
            ->get(['user_id', 'sender_type']);

        $result = array_fill_keys($userIds, 0);
        $currentUserId = null;
        $count = 0;
        $yaVimosAdmin = false;
        foreach ($mensajes as $m) {
            if ($currentUserId !== $m->user_id) {
                $currentUserId = $m->user_id;
                $count = 0;
                $yaVimosAdmin = false;
            }

            if (in_array($m->sender_type, ['admin', 'seller'], true)) {
                $yaVimosAdmin = true;
            } elseif (!$yaVimosAdmin) {
                $count++;
                $result[$m->user_id] = $count;
            }
        }
        return $result;
    }

    private function mapMensaje(ClienteVentasMensaje $m): array
    {
        $senderType = $m->sender_type === 'seller' ? 'admin' : $m->sender_type;
        $arr = [
            'id' => $m->id,
            'user_id' => $m->user_id,
            'sender_type' => $senderType,
            'body' => $m->body,
            'created_at' => $m->created_at->toIso8601String(),
            'updated_at' => $m->updated_at->toIso8601String(),
        ];
        if ($m->relationLoaded('user') && $m->user) {
            $arr['user_name'] = $m->user->name;
            $arr['user_email'] = $m->user->email;
        }
        if ($m->seller_id && $m->relationLoaded('seller') && $m->seller) {
            $arr['admin_name'] = $m->seller->name;
            $arr['admin_email'] = $m->seller->email;
            // Compatibilidad temporal para clientes viejos.
            $arr['seller_name'] = $m->seller->name;
            $arr['seller_email'] = $m->seller->email;
        }
        return $arr;
    }
}
