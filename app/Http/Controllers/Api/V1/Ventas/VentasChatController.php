<?php

namespace App\Http\Controllers\Api\V1\Ventas;

use App\Http\Controllers\Controller;
use App\Models\ClienteVentasMensaje;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class VentasChatController extends Controller
{
    /**
     * Lista de clientes que tienen al menos un mensaje, con nombre, email y cantidad de mensajes sin contestar.
     */
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

    /**
     * Mensajes del chat con un cliente (para el usuario de ventas).
     */
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
            'sender_type' => 'seller',
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
            ->where('sender_type', 'seller')
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
            ->where('sender_type', 'seller')
            ->where('seller_id', Auth::id())
            ->firstOrFail();

        $mensaje->delete();
        return response()->json(['success' => true]);
    }

    /** Cuenta solo los mensajes del cliente que están después del último mensaje de ventas (cola del hilo sin contestar). */
    private function getMensajesSinContestarPorCliente(array $userIds): array
    {
        $mensajes = ClienteVentasMensaje::whereIn('user_id', $userIds)
            ->orderBy('user_id')
            ->orderByDesc('created_at')
            ->get(['user_id', 'sender_type']);

        $result = array_fill_keys($userIds, 0);
        $currentUserId = null;
        $count = 0;
        $yaVimosVentas = false;
        foreach ($mensajes as $m) {
            if ($currentUserId !== $m->user_id) {
                $currentUserId = $m->user_id;
                $count = 0;
                $yaVimosVentas = false;
            }
            if ($m->sender_type === 'seller') {
                $yaVimosVentas = true;
            } else {
                if (! $yaVimosVentas) {
                    $count++;
                    $result[$m->user_id] = $count;
                }
            }
        }
        return $result;
    }

    private function mapMensaje(ClienteVentasMensaje $m): array
    {
        $arr = [
            'id' => $m->id,
            'user_id' => $m->user_id,
            'sender_type' => $m->sender_type,
            'body' => $m->body,
            'created_at' => $m->created_at->toIso8601String(),
            'updated_at' => $m->updated_at->toIso8601String(),
        ];
        if ($m->relationLoaded('user') && $m->user) {
            $arr['user_name'] = $m->user->name;
            $arr['user_email'] = $m->user->email;
        }
        if ($m->seller_id && $m->relationLoaded('seller') && $m->seller) {
            $arr['seller_name'] = $m->seller->name;
            $arr['seller_email'] = $m->seller->email;
        }
        return $arr;
    }
}
