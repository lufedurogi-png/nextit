<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Concerns\VerifiesAdminPassword;
use App\Http\Controllers\Controller;
use App\Models\Promocion;
use App\Models\PromocionItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class PromocionAdminController extends Controller
{
    use VerifiesAdminPassword;

    public function index(): JsonResponse
    {
        $rows = Promocion::query()
            ->withCount('items')
            ->orderByDesc('id')
            ->get()
            ->map(fn (Promocion $p) => [
                'id' => $p->id,
                'slug' => $p->slug,
                'titulo' => $p->titulo,
                'descripcion' => $p->descripcion,
                'activa' => $p->activa,
                'items_count' => $p->items_count,
                'url_tienda' => '/tienda/promocion/'.$p->slug,
            ]);

        return response()->json(['success' => true, 'data' => $rows], Response::HTTP_OK);
    }

    public function show(int $id): JsonResponse
    {
        $promo = Promocion::query()->with(['items' => fn ($q) => $q->orderBy('orden')->orderBy('id')])->find($id);
        if (! $promo) {
            return response()->json(['success' => false, 'message' => 'No encontrada'], Response::HTTP_NOT_FOUND);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $promo->id,
                'slug' => $promo->slug,
                'titulo' => $promo->titulo,
                'descripcion' => $promo->descripcion,
                'activa' => $promo->activa,
                'url_tienda' => '/tienda/promocion/'.$promo->slug,
                'claves' => $promo->items->pluck('clave')->all(),
            ],
        ], Response::HTTP_OK);
    }

    public function store(Request $request): JsonResponse
    {
        $this->assertAdminPassword($request);
        $validated = $request->validate([
            'titulo' => 'required|string|max:255',
            'descripcion' => 'nullable|string|max:5000',
            'slug' => 'nullable|string|max:160',
            'claves' => 'nullable|array|max:2000',
            'claves.*' => 'string|max:255',
        ]);

        if (! empty($validated['slug'])) {
            $slug = $this->ensureUniqueSlug(Str::slug($validated['slug']));
        } else {
            $slug = $this->uniqueSlugFromTitulo($validated['titulo']);
        }

        $claves = array_values(array_unique(array_filter(array_map('trim', $validated['claves'] ?? []))));

        $promo = DB::transaction(function () use ($slug, $validated, $claves) {
            $p = Promocion::create([
                'slug' => $slug,
                'titulo' => $validated['titulo'],
                'descripcion' => $validated['descripcion'] ?? null,
                'activa' => true,
            ]);
            foreach ($claves as $orden => $clave) {
                PromocionItem::create([
                    'promocion_id' => $p->id,
                    'clave' => $clave,
                    'orden' => $orden,
                ]);
            }

            return $p;
        });

        return response()->json([
            'success' => true,
            'message' => 'Promoción creada',
            'data' => [
                'id' => $promo->id,
                'slug' => $promo->slug,
                'titulo' => $promo->titulo,
                'url_tienda' => '/tienda/promocion/'.$promo->slug,
                'items_count' => count($claves),
            ],
        ], Response::HTTP_CREATED);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $this->assertAdminPassword($request);
        $promo = Promocion::find($id);
        if (! $promo) {
            return response()->json(['success' => false, 'message' => 'No encontrada'], Response::HTTP_NOT_FOUND);
        }

        $validated = $request->validate([
            'titulo' => 'sometimes|string|max:255',
            'descripcion' => 'nullable|string|max:5000',
            'activa' => 'sometimes|boolean',
        ]);

        $promo->fill(array_intersect_key($validated, array_flip(['titulo', 'descripcion', 'activa'])));
        $promo->save();

        return response()->json([
            'success' => true,
            'message' => 'Promoción actualizada',
            'data' => [
                'id' => $promo->id,
                'slug' => $promo->slug,
                'titulo' => $promo->titulo,
                'descripcion' => $promo->descripcion,
                'activa' => $promo->activa,
            ],
        ], Response::HTTP_OK);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $this->assertAdminPassword($request);
        $promo = Promocion::find($id);
        if (! $promo) {
            return response()->json(['success' => false, 'message' => 'No encontrada'], Response::HTTP_NOT_FOUND);
        }
        $promo->delete();

        return response()->json(['success' => true, 'message' => 'Promoción eliminada'], Response::HTTP_OK);
    }

    public function agregarItem(Request $request, int $id): JsonResponse
    {
        $this->assertAdminPassword($request);
        $promo = Promocion::find($id);
        if (! $promo) {
            return response()->json(['success' => false, 'message' => 'No encontrada'], Response::HTTP_NOT_FOUND);
        }

        $validated = $request->validate([
            'clave' => 'required|string|max:255',
        ]);
        $clave = trim($validated['clave']);

        if (PromocionItem::query()->where('promocion_id', $promo->id)->where('clave', $clave)->exists()) {
            return response()->json(['success' => false, 'message' => 'El producto ya está en la promoción'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $maxOrden = (int) PromocionItem::query()->where('promocion_id', $promo->id)->max('orden');
        PromocionItem::create([
            'promocion_id' => $promo->id,
            'clave' => $clave,
            'orden' => $maxOrden + 1,
        ]);

        return response()->json(['success' => true, 'message' => 'Producto agregado a la promoción'], Response::HTTP_CREATED);
    }

    public function quitarItem(Request $request, int $id): JsonResponse
    {
        $this->assertAdminPassword($request);
        $promo = Promocion::find($id);
        if (! $promo) {
            return response()->json(['success' => false, 'message' => 'No encontrada'], Response::HTTP_NOT_FOUND);
        }

        $validated = $request->validate([
            'clave' => 'required|string|max:255',
        ]);
        $clave = trim($validated['clave']);

        PromocionItem::query()->where('promocion_id', $promo->id)->where('clave', $clave)->delete();

        return response()->json(['success' => true, 'message' => 'Producto quitado de la promoción'], Response::HTTP_OK);
    }

    private function uniqueSlugFromTitulo(string $titulo): string
    {
        $base = Str::slug($titulo);
        if ($base === '') {
            $base = 'promocion';
        }

        return $this->ensureUniqueSlug($base);
    }

    private function ensureUniqueSlug(string $base): string
    {
        $slug = $base;
        $i = 0;
        while (Promocion::query()->where('slug', $slug)->exists()) {
            $i++;
            $slug = $base.'-'.$i;
        }

        return $slug;
    }
}
