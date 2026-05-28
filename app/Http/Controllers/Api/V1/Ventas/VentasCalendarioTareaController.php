<?php

namespace App\Http\Controllers\Api\V1\Ventas;

use App\Http\Controllers\Controller;
use App\Models\VentasCalendarioTarea;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class VentasCalendarioTareaController extends Controller
{
    public function index(): JsonResponse
    {
        $tareas = VentasCalendarioTarea::query()
            ->where('user_id', Auth::id())
            ->orderBy('fecha')
            // MySQL acepta "hora IS NULL, hora"; SQL Server no. CASE es portable (sqlsrv, mysql, sqlite).
            ->orderByRaw('CASE WHEN hora IS NULL THEN 1 ELSE 0 END')
            ->orderBy('hora')
            ->get()
            ->map(fn (VentasCalendarioTarea $t) => $this->mapTarea($t));

        return response()->json(['success' => true, 'data' => $tareas]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'fecha' => ['required', 'date_format:Y-m-d'],
            'hora' => ['nullable', 'regex:/^\d{2}:\d{2}$/'],
            'texto' => ['required', 'string', 'max:2000'],
        ]);

        $tarea = VentasCalendarioTarea::create([
            'user_id' => Auth::id(),
            'fecha' => $validated['fecha'],
            'hora' => $validated['hora'] ?? null,
            'texto' => $validated['texto'],
        ]);

        return response()->json([
            'success' => true,
            'data' => $this->mapTarea($tarea->fresh()),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $tarea = VentasCalendarioTarea::where('user_id', Auth::id())->whereKey($id)->firstOrFail();

        $validated = $request->validate([
            'fecha' => ['sometimes', 'required', 'date_format:Y-m-d'],
            'hora' => ['sometimes', 'nullable', 'regex:/^\d{2}:\d{2}$/'],
            'texto' => ['sometimes', 'required', 'string', 'max:2000'],
        ]);

        $tarea->update($validated);

        return response()->json([
            'success' => true,
            'data' => $this->mapTarea($tarea->fresh()),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $tarea = VentasCalendarioTarea::where('user_id', Auth::id())->whereKey($id)->firstOrFail();
        $tarea->delete();

        return response()->json(['success' => true]);
    }

    /**
     * @return array<string, mixed>
     */
    private function mapTarea(VentasCalendarioTarea $t): array
    {
        return [
            'id' => $t->id,
            'dateISO' => $t->fecha->format('Y-m-d'),
            'time' => $t->hora,
            'text' => $t->texto,
            'createdAt' => $t->created_at?->toIso8601String(),
        ];
    }
}
