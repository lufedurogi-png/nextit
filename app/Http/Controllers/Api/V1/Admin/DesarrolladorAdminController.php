<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Desarrollador;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

class DesarrolladorAdminController extends Controller
{
    protected function getDisk(): string
    {
        return config('filesystems.publicidad_disk', 'public');
    }

    public function index(): JsonResponse
    {
        $items = Desarrollador::query()
            ->orderBy('created_at')
            ->orderBy('id')
            ->get()
            ->map(fn (Desarrollador $d) => [
                'id' => $d->id,
                'nombre' => $d->nombre,
                'rol' => $d->rol,
                'descripcion' => $d->descripcion,
                'foto_url' => $d->foto_url,
                'fecha_inicio' => optional($d->fecha_inicio)->format('Y-m-d'),
                'fecha_fin' => optional($d->fecha_fin)->format('Y-m-d'),
            ]);

        return response()->json($items, Response::HTTP_OK);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nombre' => 'required|string|max:140',
            'rol' => 'required|string|max:140',
            'descripcion' => 'required|string|max:2000',
            'fecha_inicio' => 'nullable|date',
            'fecha_fin' => [
                'nullable',
                'date',
                function (string $attribute, mixed $value, \Closure $fail) use ($request) {
                    if (! $value || ! $request->filled('fecha_inicio')) {
                        return;
                    }
                    if (strcmp((string) $value, (string) $request->input('fecha_inicio')) < 0) {
                        $fail('La fecha fin debe ser posterior o igual a la fecha de inicio.');
                    }
                },
            ],
            'foto' => 'required|image|mimes:jpeg,jpg,png,webp|max:9216',
        ]);

        $disk = $this->getDisk();
        $path = $request->file('foto')->store('publicidad/desarrolladores', $disk);
        $url = Storage::disk($disk)->url($path);

        $d = Desarrollador::query()->create([
            'nombre' => $data['nombre'],
            'rol' => $data['rol'],
            'descripcion' => $data['descripcion'],
            'foto_url' => $url,
            'foto_path' => $path,
            'fecha_inicio' => $data['fecha_inicio'] ?? null,
            'fecha_fin' => $data['fecha_fin'] ?? null,
            'activo' => true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Integrante guardado correctamente',
            'data' => [
                'id' => $d->id,
            ],
        ], Response::HTTP_CREATED);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $d = Desarrollador::query()->find($id);
        if (! $d) {
            return response()->json(['success' => false, 'message' => 'Integrante no encontrado'], Response::HTTP_NOT_FOUND);
        }

        $data = $request->validate([
            'nombre' => 'required|string|max:140',
            'rol' => 'required|string|max:140',
            'descripcion' => 'required|string|max:2000',
            'fecha_inicio' => 'nullable|date',
            'fecha_fin' => [
                'nullable',
                'date',
                function (string $attribute, mixed $value, \Closure $fail) use ($request) {
                    if (! $value || ! $request->filled('fecha_inicio')) {
                        return;
                    }
                    if (strcmp((string) $value, (string) $request->input('fecha_inicio')) < 0) {
                        $fail('La fecha fin debe ser posterior o igual a la fecha de inicio.');
                    }
                },
            ],
            'foto' => 'nullable|image|mimes:jpeg,jpg,png,webp|max:9216',
        ]);

        $disk = $this->getDisk();
        if ($request->hasFile('foto')) {
            if ($d->foto_path && Storage::disk($disk)->exists($d->foto_path)) {
                Storage::disk($disk)->delete($d->foto_path);
            }
            $path = $request->file('foto')->store('publicidad/desarrolladores', $disk);
            $url = Storage::disk($disk)->url($path);
            $d->foto_path = $path;
            $d->foto_url = $url;
        }

        $d->nombre = $data['nombre'];
        $d->rol = $data['rol'];
        $d->descripcion = $data['descripcion'];
        $d->fecha_inicio = $data['fecha_inicio'] ?? null;
        $d->fecha_fin = $data['fecha_fin'] ?? null;
        $d->save();

        return response()->json([
            'success' => true,
            'message' => 'Integrante actualizado correctamente',
        ], Response::HTTP_OK);
    }

    public function destroy(int $id): JsonResponse
    {
        $d = Desarrollador::query()->find($id);
        if (! $d) {
            return response()->json(['success' => false, 'message' => 'Integrante no encontrado'], Response::HTTP_NOT_FOUND);
        }

        $disk = $this->getDisk();
        if ($d->foto_path && Storage::disk($disk)->exists($d->foto_path)) {
            Storage::disk($disk)->delete($d->foto_path);
        }

        $d->delete();

        return response()->json([
            'success' => true,
            'message' => 'Integrante eliminado correctamente',
        ], Response::HTTP_OK);
    }
}

