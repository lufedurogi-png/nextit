<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AdminStatsController extends Controller
{
    /**
     * Actividad agregada por mes (últimos 12 meses): registros por rol e inicios de sesión vía tokens Sanctum.
     */
    public function actividadUsuarios(): JsonResponse
    {
        Carbon::setLocale('es');

        $rows = [];
        for ($i = 11; $i >= 0; $i--) {
            $monthStart = now()->subMonths($i)->startOfMonth();
            $monthEnd = $monthStart->copy()->endOfMonth();

            $regs = User::query()
                ->whereBetween('created_at', [$monthStart, $monthEnd])
                ->selectRaw('role, COUNT(*) as c')
                ->groupBy('role')
                ->pluck('c', 'role');

            $ra = (int) ($regs['admin'] ?? 0);
            $rc = (int) ($regs['cliente'] ?? 0);
            $rv = (int) ($regs['vendedor'] ?? 0);

            $loginRows = DB::table('personal_access_tokens as t')
                ->join('users as u', 'u.id', '=', 't.tokenable_id')
                ->where('t.tokenable_type', User::class)
                ->whereNotNull('t.last_used_at')
                ->whereBetween('t.last_used_at', [$monthStart, $monthEnd])
                ->select('u.id', 'u.role')
                ->distinct()
                ->get();

            $la = $loginRows->where('role', 'admin')->count();
            $lc = $loginRows->where('role', 'cliente')->count();
            $lv = $loginRows->where('role', 'vendedor')->count();

            $rows[] = [
                'mes' => ucfirst($monthStart->translatedFormat('M Y')),
                'registros' => $ra + $rc + $rv,
                'registros_admin' => $ra,
                'registros_cliente' => $rc,
                'registros_vendedor' => $rv,
                'logins' => $la + $lc + $lv,
                'logins_admin' => $la,
                'logins_cliente' => $lc,
                'logins_vendedor' => $lv,
            ];
        }

        return response()->json([
            'success' => true,
            'data' => $rows,
        ]);
    }

    /**
     * Eventos en ventana móvil de 31 días: registros (alta de usuario) y uso de token (last_used_at) como inicio de sesión.
     *
     * @return list<array{dia: int, hora: int, tipo: int, evento: string}>
     */
    public function actividadEventos(): JsonResponse
    {
        $windowStart = now()->subDays(30)->startOfDay();
        $windowEnd = now()->endOfDay();

        $events = [];

        foreach (User::query()
            ->whereBetween('created_at', [$windowStart, $windowEnd])
            ->orderBy('created_at')
            ->cursor() as $u) {
            $at = Carbon::parse($u->created_at);
            $events[] = [
                'dia' => min(31, (int) $windowStart->diffInDays($at->copy()->startOfDay()) + 1),
                'hora' => (int) $at->format('G'),
                'tipo' => $this->roleToTipo((string) $u->role),
                'evento' => 'registro',
            ];
        }

        $tokens = DB::table('personal_access_tokens as t')
            ->join('users as u', 'u.id', '=', 't.tokenable_id')
            ->where('t.tokenable_type', User::class)
            ->whereNotNull('t.last_used_at')
            ->whereBetween('t.last_used_at', [$windowStart, $windowEnd])
            ->select('t.last_used_at', 'u.role')
            ->orderBy('t.last_used_at')
            ->limit(500)
            ->get();

        foreach ($tokens as $row) {
            $at = Carbon::parse($row->last_used_at);
            $events[] = [
                'dia' => min(31, (int) $windowStart->diffInDays($at->copy()->startOfDay()) + 1),
                'hora' => (int) $at->format('G'),
                'tipo' => $this->roleToTipo((string) $row->role),
                'evento' => 'login',
            ];
        }

        usort($events, function (array $a, array $b) {
            if ($a['dia'] !== $b['dia']) {
                return $a['dia'] <=> $b['dia'];
            }

            return $a['hora'] <=> $b['hora'];
        });

        return response()->json([
            'success' => true,
            'data' => $events,
        ]);
    }

    private function roleToTipo(string $role): int
    {
        return match ($role) {
            'admin' => 1,
            'vendedor' => 3,
            default => 2,
        };
    }
}
