<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Concerns\VerifiesAdminPassword;
use App\Http\Controllers\Controller;
use App\Models\Publicidad;
use App\Models\PublicidadCarruselConfig;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

class PublicidadAdminController extends Controller
{
    use VerifiesAdminPassword;

    protected function getDisk(): string
    {
        return config('filesystems.publicidad_disk', 'public');
    }

    /**
     * Configuración del carrusel + lista de imágenes (incluye inactivas).
     */
    public function index(): JsonResponse
    {
        $config = PublicidadCarruselConfig::singleton();
        $imagenes = Publicidad::query()
            ->orderBy('orden')
            ->orderBy('id')
            ->get()
            ->map(fn ($p) => [
                'id' => $p->id,
                'url' => $p->url,
                'titulo' => $p->titulo,
                'enlace' => $p->enlace,
                'orden' => $p->orden,
                'activo' => $p->activo,
            ]);

        return response()->json([
            'carrusel_activo' => (int) $config->activo === 1,
            'imagenes' => $imagenes,
        ], Response::HTTP_OK);
    }

    /**
     * Activa o desactiva el carrusel completo en la tienda (0/1 en BD).
     */
    public function updateCarrusel(Request $request): JsonResponse
    {
        $this->assertAdminPassword($request);
        $validated = $request->validate([
            'activo' => 'required|boolean',
        ]);

        $config = PublicidadCarruselConfig::singleton();
        $config->activo = $validated['activo'] ? 1 : 0;
        $config->save();

        return response()->json([
            'success' => true,
            'message' => $config->activo ? 'Carrusel activado en la tienda' : 'Carrusel desactivado en la tienda',
            'carrusel_activo' => (int) $config->activo === 1,
        ], Response::HTTP_OK);
    }

    /**
     * Sube y guarda una nueva imagen de publicidad.
     */
    public function store(Request $request): JsonResponse
    {
        $this->assertAdminPassword($request);
        $request->validate([
            'imagen' => 'required|image|mimes:jpeg,jpg,png,gif,webp|max:9216',
            'titulo' => 'nullable|string|max:255',
            'orden' => 'nullable|integer|min:0',
            'enlace' => 'nullable|string|max:2048',
        ]);

        $file = $request->file('imagen');
        $disk = $this->getDisk();

        $path = $file->store('publicidad', $disk);
        $url = Storage::disk($disk)->url($path);

        $orden = $request->input('orden');
        $maxOrden = Publicidad::max('orden') ?? 0;
        $orden = $orden !== null ? (int) $orden : $maxOrden + 1;

        $enlace = $request->input('enlace');
        $enlace = is_string($enlace) && trim($enlace) !== '' ? trim($enlace) : null;

        $publicidad = Publicidad::create([
            'url' => $url,
            'path' => $path,
            'titulo' => $request->input('titulo'),
            'enlace' => $enlace,
            'orden' => $orden,
            'activo' => true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Imagen guardada correctamente',
            'data' => [
                'id' => $publicidad->id,
                'url' => $publicidad->url,
                'titulo' => $publicidad->titulo,
                'enlace' => $publicidad->enlace,
                'orden' => $publicidad->orden,
            ],
        ], Response::HTTP_CREATED);
    }

    /**
     * Elimina una imagen de publicidad.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $this->assertAdminPassword($request);
        $publicidad = Publicidad::find($id);
        if (! $publicidad) {
            return response()->json(['success' => false, 'message' => 'No encontrada'], Response::HTTP_NOT_FOUND);
        }

        $disk = $this->getDisk();
        if ($publicidad->path && Storage::disk($disk)->exists($publicidad->path)) {
            Storage::disk($disk)->delete($publicidad->path);
        }

        $publicidad->delete();

        return response()->json([
            'success' => true,
            'message' => 'Imagen eliminada correctamente',
        ], Response::HTTP_OK);
    }
}
