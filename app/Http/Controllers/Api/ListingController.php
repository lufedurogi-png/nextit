<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Collection;
use App\Models\CollectionItem;
use App\Models\Listing;
use App\Models\User;
use App\Models\UserSearchLog;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ListingController extends Controller
{
    public const TIENDA_BUCKET = '__ventas_tienda__';

    public function index(Request $request)
    {
        $q = trim((string) $request->query('q', ''));
        $cat = trim((string) $request->query('category', ''));

        $query = Listing::query()
            ->where('status', 'active')
            ->with(['seller:id,name,email,avatar_path', 'item.collection']);

        $hasQ = $q !== '';
        $hasCat = $cat !== '' && strcasecmp($cat, 'todos') !== 0;
        if ($hasQ) {
            $this->registerSearchLog((int) $request->user()->id, $q, 'shop_query');
        }
        if ($hasCat) {
            $this->registerSearchLog((int) $request->user()->id, $cat, 'shop_category');
        }
        if (! $hasQ && ! $hasCat) {
            return $query->latest()->limit(120)->get();
        }

        $rows = $query->latest()->limit(300)->get();
        $qTokens = $this->tokens($q);
        $catTokens = $hasCat ? $this->tokens($cat) : [];

        $filtered = $rows->filter(function (Listing $listing) use ($qTokens, $catTokens, $hasQ, $hasCat) {
            $haystack = $this->listingSearchText($listing);
            $hayTokens = $this->tokens($haystack);

            $qOk = $hasQ ? $this->passesFuzzyFilter($qTokens, $haystack, $hayTokens) : false;
            $catOk = $hasCat ? $this->passesFuzzyFilter($catTokens, $haystack, $hayTokens) : false;

            // Si llegan ambos filtros, aceptamos coincidencia por cualquiera para no perder resultados útiles.
            return ($hasQ && $qOk) || ($hasCat && $catOk);
        });

        return $filtered->values()->take(120);
    }

    public function mine(Request $request)
    {
        return Listing::query()
            ->where('seller_id', $request->user()->id)
            ->where('status', 'active')
            ->with(['item.collection'])
            ->latest()
            ->get();
    }

    public function show(Request $request, Listing $listing)
    {
        abort_if($listing->status !== 'active' && (int) $listing->seller_id !== (int) $request->user()->id, 404);

        return $listing->load(['item.collection', 'seller:id,name,email,avatar_path']);
    }

    public function store(Request $request)
    {
        $source = $request->input('source', 'collection');
        if ($source === 'manual') {
            return $this->storeManual($request);
        }

        return $this->storeFromCollection($request);
    }

    /**
     * Publicación creada desde fotos y formulario (se genera un registro mínimo en el inventario interno).
     */
    protected function storeManual(Request $request)
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:200'],
            'marketplace_brand' => ['nullable', 'string', 'max:200'],
            'marketplace_category' => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string', 'max:5000'],
            'images' => ['required', 'array', 'min:1', 'max:8'],
            'images.*' => ['string', 'max:500'],
            'quantity' => ['required', 'integer', 'min:1'],
            'price' => ['required', 'numeric', 'min:0'],
        ]);

        $collection = $this->getOrCreateTiendaCollection($request->user());

        $item = $collection->items()->create([
            'title' => $data['title'],
            'ref_number' => null,
            'description' => $data['description'] ?? null,
            'quantity' => $data['quantity'],
            'rarity_code' => 'C',
            'image_path' => $data['images'][0] ?? null,
        ]);

        $listing = Listing::create([
            'seller_id' => $request->user()->id,
            'collection_item_id' => $item->id,
            'quantity' => $data['quantity'],
            'price' => $data['price'],
            'extra_description' => $data['description'] ? trim($data['description']) : null,
            'extra_images' => null,
            'marketplace_title' => $data['title'],
            'marketplace_brand' => $data['marketplace_brand'] ? trim($data['marketplace_brand']) : null,
            'marketplace_category' => $data['marketplace_category'],
            'marketplace_images' => $data['images'],
            'include_primary_item_image' => true,
            'status' => 'active',
        ]);

        return response()->json($listing->load(['item.collection', 'seller:id,name,email,avatar_path']), 201);
    }

    /**
     * Publicación desde un producto de colección.
     */
    protected function storeFromCollection(Request $request)
    {
        $data = $request->validate([
            'collection_item_id' => ['required', 'integer', 'exists:collection_items,id'],
            'quantity' => ['required', 'integer', 'min:1'],
            'price' => ['required', 'numeric', 'min:0'],
            'marketplace_title' => ['nullable', 'string', 'max:200'],
            'extra_description' => ['nullable', 'string', 'max:5000'],
            'extra_images' => ['nullable', 'array', 'max:8'],
            'extra_images.*' => ['string', 'max:500'],
            'marketplace_brand' => ['nullable', 'string', 'max:200'],
            'marketplace_category' => ['required', 'string', 'max:150'],
            'include_primary_item_image' => ['sometimes', 'boolean'],
        ]);

        $item = CollectionItem::query()
            ->whereKey($data['collection_item_id'])
            ->whereHas('collection', function ($q) use ($request) {
                $q->where('user_id', $request->user()->id);
            })
            ->first();

        if (! $item) {
            return response()->json([
                'message' => 'La pieza seleccionada no pertenece a tus colecciones (o cambió). Recarga la vista e inténtalo de nuevo.',
            ], 422);
        }

        abort_if($data['quantity'] > $item->quantity, 422, 'Cantidad mayor al inventario.');

        $includePrimary = array_key_exists('include_primary_item_image', $data)
            ? (bool) $data['include_primary_item_image']
            : true;
        if (! $includePrimary && empty($data['extra_images'] ?? [])) {
            return response()->json(['message' => 'Si quitas la foto de inventario, añade al menos una imagen.'], 422);
        }

        $listing = Listing::create([
            'seller_id' => $request->user()->id,
            'collection_item_id' => $item->id,
            'quantity' => $data['quantity'],
            'price' => $data['price'],
            'extra_description' => $data['extra_description'] ?? null,
            'extra_images' => $data['extra_images'] ?? null,
            'marketplace_title' => ! empty($data['marketplace_title']) ? trim((string) $data['marketplace_title']) : $item->title,
            'marketplace_brand' => $data['marketplace_brand'] ? trim($data['marketplace_brand']) : null,
            'marketplace_category' => $data['marketplace_category'],
            'marketplace_images' => null,
            'include_primary_item_image' => $includePrimary,
            'status' => 'active',
        ]);

        return response()->json($listing->load(['item.collection', 'seller:id,name,email,avatar_path']), 201);
    }

    public function update(Request $request, Listing $listing)
    {
        abort_unless($listing->seller_id === $request->user()->id, 403);
        abort_unless($listing->status === 'active', 404);

        $data = $request->validate([
            'price' => ['sometimes', 'numeric', 'min:0'],
            'quantity' => ['sometimes', 'integer', 'min:1'],
            'extra_description' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'extra_images' => ['sometimes', 'nullable', 'array', 'max:8'],
            'extra_images.*' => ['string', 'max:500'],
            'marketplace_title' => ['sometimes', 'nullable', 'string', 'max:200'],
            'marketplace_brand' => ['sometimes', 'nullable', 'string', 'max:200'],
            'marketplace_category' => ['sometimes', 'string', 'max:150'],
            'marketplace_images' => ['sometimes', 'nullable', 'array', 'max:8'],
            'marketplace_images.*' => ['string', 'max:500'],
            'include_primary_item_image' => ['sometimes', 'boolean'],
        ]);

        if (array_key_exists('quantity', $data) && $listing->item) {
            abort_if($data['quantity'] > $listing->item->quantity, 422, 'Cantidad mayor al inventario.');
        }

        $listing->update($data);

        return $listing->fresh()->load(['item.collection', 'seller:id,name,email,avatar_path']);
    }

    public function destroy(Request $request, Listing $listing)
    {
        abort_unless($listing->seller_id === $request->user()->id, 403);
        $listing->update(['status' => 'cancelled']);

        return response()->json(['ok' => true]);
    }

    private function getOrCreateTiendaCollection(User $user): Collection
    {
        return Collection::query()->firstOrCreate(
            [
                'user_id' => $user->id,
                'name' => self::TIENDA_BUCKET,
            ],
            [
                'accent_color' => '#0d9488',
                'category' => 'tienda_interna',
                'brand' => null,
            ]
        );
    }

    /**
     * Texto base para búsqueda difusa: combina campos de listing, item y colección.
     */
    private function listingSearchText(Listing $listing): string
    {
        return implode(' ', array_filter([
            (string) $listing->marketplace_title,
            (string) $listing->marketplace_brand,
            (string) $listing->marketplace_category,
            (string) $listing->extra_description,
            (string) optional($listing->item)->title,
            (string) optional($listing->item)->description,
            (string) optional(optional($listing->item)->collection)->name,
            (string) optional(optional($listing->item)->collection)->brand,
            (string) optional(optional($listing->item)->collection)->category,
        ]));
    }

    /**
     * Divide texto normalizado en tokens únicos para comparar por palabras.
     */
    private function tokens(string $text): array
    {
        $normalized = Str::of($text)->lower()->ascii()->toString();
        $parts = preg_split('/[^a-z0-9]+/i', $normalized) ?: [];

        return array_values(array_unique(array_filter($parts, fn ($p) => strlen($p) >= 2)));
    }

    /**
     * Filtro de coincidencia aproximada:
     * - Coincidencia exacta/parcial rápida.
     * - Similitud por token con umbral 70%.
     * - Requiere al menos una palabra clave coincidente.
     */
    private function passesFuzzyFilter(array $needleTokens, string $haystackRaw, array $hayTokens): bool
    {
        if (empty($needleTokens)) {
            return true;
        }

        $haystack = Str::of($haystackRaw)->lower()->ascii()->toString();
        $matched = 0;
        foreach ($needleTokens as $needle) {
            if (str_contains($haystack, $needle)) {
                $matched++;

                continue;
            }

            $best = 0.0;
            foreach ($hayTokens as $token) {
                $score = $this->tokenSimilarity($needle, $token);
                if ($score > $best) {
                    $best = $score;
                }
                if ($best >= 0.7) {
                    break;
                }
            }

            if ($best >= 0.7) {
                $matched++;
            }
        }

        return $matched >= 1;
    }

    /**
     * Similaridad entre dos palabras: 1.0 igual, 0.0 totalmente distinta.
     */
    private function tokenSimilarity(string $a, string $b): float
    {
        if ($a === $b) {
            return 1.0;
        }
        $max = max(strlen($a), strlen($b));
        if ($max === 0) {
            return 0.0;
        }
        $distance = levenshtein($a, $b);

        return max(0, 1 - ($distance / $max));
    }

    private function registerSearchLog(int $userId, string $query, string $context): void
    {
        $normalized = trim(mb_strtolower($query));
        if ($normalized === '' || mb_strlen($normalized) < 2) {
            return;
        }

        $existing = UserSearchLog::query()
            ->where('user_id', $userId)
            ->where('context', $context)
            ->where('query', $normalized)
            ->latest()
            ->first();

        if ($existing) {
            $existing->increment('hits');
            $existing->touch();

            return;
        }

        UserSearchLog::create([
            'user_id' => $userId,
            'query' => $normalized,
            'context' => $context,
            'hits' => 1,
        ]);
    }
}
