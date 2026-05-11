<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class AdminPlanProIndefiniteController extends Controller
{
    private const FAR_END = '2099-12-31 23:59:59';

    private function assertPassword(Request $request): void
    {
        $valid = $request->validate([
            'password' => 'required|string',
        ]);
        $admin = Auth::user();
        abort_unless($admin && Hash::check($valid['password'], $admin->password), 422, 'Contraseña de administrador incorrecta.');
    }

    public function search(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));
        $query = User::query()
            ->select([
                'id', 'name', 'email',
                'pro_subscription_indefinite', 'pro_subscription_indefinite_paused', 'pro_subscription_indefinite_started_at',
                'pro_subscription_ends_at',
            ])
            ->orderBy('name');

        if (strlen($q) >= 2) {
            $term = '%'.$q.'%';
            $query->where(function ($w) use ($term) {
                $w->where('email', 'like', $term)
                    ->orWhere('name', 'like', $term);
            });
        } else {
            $query->whereRaw('1 = 0');
        }

        $rows = $query->limit(120)->get()->map(fn (User $u) => [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'pro_subscription_indefinite' => (bool) $u->pro_subscription_indefinite,
            'pro_subscription_indefinite_paused' => (bool) $u->pro_subscription_indefinite_paused,
            'pro_subscription_indefinite_started_at' => $u->pro_subscription_indefinite_started_at?->toIso8601String(),
        ]);

        return response()->json([
            'success' => true,
            'data' => $rows,
        ]);
    }

    public function indefiniteList(): JsonResponse
    {
        $rows = User::query()
            ->where('pro_subscription_indefinite', true)
            ->orderByDesc('pro_subscription_indefinite_started_at')
            ->get([
                'id', 'name', 'email',
                'pro_subscription_indefinite_started_at', 'pro_subscription_indefinite_paused',
            ])
            ->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'since' => $u->pro_subscription_indefinite_started_at?->toIso8601String(),
                'paused' => (bool) $u->pro_subscription_indefinite_paused,
            ]);

        return response()->json([
            'success' => true,
            'data' => $rows,
        ]);
    }

    public function grant(Request $request, User $user): JsonResponse
    {
        $this->assertPassword($request);

        $user->forceFill([
            'pro_subscription_indefinite' => true,
            'pro_subscription_indefinite_paused' => false,
            'pro_subscription_indefinite_started_at' => now(),
            'pro_subscription_cancelled' => false,
            'pro_subscription_ends_at' => self::FAR_END,
        ])->save();

        return response()->json([
            'success' => true,
            'message' => 'Usuario marcado como Pro Coleccionista indefinido.',
            'data' => ['id' => $user->id],
        ]);
    }

    public function pause(Request $request, User $user): JsonResponse
    {
        $this->assertPassword($request);
        abort_if(! $user->pro_subscription_indefinite, 422, 'Este usuario no tiene Pro indefinido.');

        $user->forceFill(['pro_subscription_indefinite_paused' => true])->save();

        return response()->json([
            'success' => true,
            'message' => 'Pro indefinido pausado.',
            'data' => ['id' => $user->id],
        ]);
    }

    public function resume(Request $request, User $user): JsonResponse
    {
        $this->assertPassword($request);
        abort_if(! $user->pro_subscription_indefinite, 422, 'Este usuario no tiene Pro indefinido.');

        $user->forceFill(['pro_subscription_indefinite_paused' => false])->save();

        return response()->json([
            'success' => true,
            'message' => 'Pro indefinido reanudado.',
            'data' => ['id' => $user->id],
        ]);
    }

    public function remove(Request $request, User $user): JsonResponse
    {
        $this->assertPassword($request);
        abort_if(! $user->pro_subscription_indefinite, 422, 'Este usuario no tiene Pro indefinido.');

        $far = new \DateTimeImmutable(self::FAR_END);
        $end = $user->pro_subscription_ends_at;
        $wasFar = $end instanceof CarbonInterface && $end->getTimestamp() >= $far->getTimestamp();

        $user->forceFill([
            'pro_subscription_indefinite' => false,
            'pro_subscription_indefinite_paused' => false,
            'pro_subscription_indefinite_started_at' => null,
        ]);

        if ($wasFar) {
            $user->pro_subscription_ends_at = now();
        }

        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Pro indefinido retirado.',
            'data' => ['id' => $user->id],
        ]);
    }
}
