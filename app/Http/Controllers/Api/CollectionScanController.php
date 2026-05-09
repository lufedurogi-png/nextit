<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Collection;
use App\Models\CollectionItem;
use App\Models\FranchiseStamp;
use App\Models\ScanUsageEvent;
use App\Services\Vision\GoogleVisionTextDetectionService;
use App\Services\Vision\StampMatcherService;
use App\Services\Vision\StampOcrParser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class CollectionScanController extends Controller
{
    public function __construct(
        private readonly GoogleVisionTextDetectionService $vision,
        private readonly StampOcrParser $parser,
        private readonly StampMatcherService $matcher,
    ) {}

    public function scan(Request $request, Collection $collection): JsonResponse
    {
        abort_if((int) $collection->user_id !== (int) $request->user()->id, 403);

        if (! (bool) $request->user()->scanner_enabled) {
            return response()->json([
                'success' => false,
                'message' => 'Tu acceso al escáner está pausado temporalmente. Contacta a soporte.',
                'data' => ['scanner_blocked' => true],
            ], 403);
        }

        $request->validate([
            'frame' => ['required', 'file', 'image', 'max:15360'],
        ]);

        if (! $collection->franchise_id) {
            return response()->json([
                'success' => false,
                'message' => 'Asigna una franquicia de referencia a la colección antes de escanear.',
                'data' => ['needs_franchise' => true],
            ], 422);
        }

        $file = $request->file('frame');
        $binary = (string) file_get_contents($file->getRealPath());

        try {
            $rawText = $this->vision->detectDocumentText($binary);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'data' => ['ocr' => null],
            ], 502);
        }

        $ocr = $this->parser->parse($rawText);
        $stamps = FranchiseStamp::query()->where('franchise_id', $collection->franchise_id)->get();
        $match = $this->matcher->bestMatch($stamps, $ocr);
        $best = $match['best'];

        // Una fila por cada escaneo que invocó Vision con éxito (con o sin match en catálogo).
        // Así el conteo mensual refleja lo que Google puede cobrar, no solo guardados en colección.
        ScanUsageEvent::query()->create([
            'user_id' => $request->user()->id,
            'collection_id' => $collection->id,
            'franchise_stamp_id' => $best?->id,
        ]);

        $mergedPreview = $best ? $this->buildMergedCatalogForItem($best, $ocr) : null;

        $payload = [
            'success' => true,
            'ocr' => $ocr,
            'match' => [
                'score' => $match['score'],
                'stamp' => $best ? [
                    'id' => $best->id,
                    'player_name' => $best->player_name,
                    'country_code' => $best->country_code,
                    'club' => $best->club,
                    'external_code' => $best->external_code,
                    'catalog_merged' => $mergedPreview,
                    'sparse_catalog' => $this->matcher->isSparseCatalogStamp($best),
                ] : null,
            ],
            'saved' => false,
            'item' => null,
            'duplicate_cooldown' => false,
        ];

        if (! $best) {
            return response()->json($payload);
        }

        $recent = CollectionItem::query()
            ->where('collection_id', $collection->id)
            ->where('franchise_stamp_id', $best->id)
            ->where('created_at', '>=', now()->subSeconds(12))
            ->exists();

        if ($recent) {
            $payload['duplicate_cooldown'] = true;

            return response()->json($payload);
        }

        $path = $file->store('uploads', 'public');
        $url = Storage::disk('public')->url($path);

        $stamp = $best;
        $catalogMerged = $this->buildMergedCatalogForItem($stamp, $ocr);
        $referenceKeys = [
            'player_name' => $stamp->player_name,
            'country_code' => $stamp->country_code,
            'external_code' => $stamp->external_code,
        ];
        // `catalog`: datos de referencia (los que vienen del JSON/BD) + campos extra completados desde el OCR ya estructurado.
        $description = json_encode([
            'matched_stamp_id' => $stamp->id,
            'score' => round((float) $match['score'], 1),
            'sparse_catalog' => $this->matcher->isSparseCatalogStamp($stamp),
            'reference' => $referenceKeys,
            'catalog' => $catalogMerged,
            'ocr_reading' => $ocr,
        ], JSON_UNESCAPED_UNICODE) ?: '{}';

        $item = CollectionItem::query()
            ->where('collection_id', $collection->id)
            ->where('franchise_stamp_id', $stamp->id)
            ->first();

        if ($item) {
            $item->fill([
                'title' => ($catalogMerged['player_name'] ?? null) ?: $stamp->player_name ?: 'Estampa',
                'ref_number' => $stamp->external_code ?: (string) $stamp->id,
                'description' => $description,
                'rarity_code' => 'C',
                'image_path' => $path,
                'source' => 'vision_scan',
            ]);
            $item->quantity = max(1, (int) $item->quantity) + 1;
            $item->save();
        } else {
            $item = $collection->items()->create([
                'title' => ($catalogMerged['player_name'] ?? null) ?: $stamp->player_name ?: 'Estampa',
                'ref_number' => $stamp->external_code ?: (string) $stamp->id,
                'description' => $description,
                'quantity' => 1,
                'rarity_code' => 'C',
                'image_path' => $path,
                'source' => 'vision_scan',
                'franchise_stamp_id' => $stamp->id,
            ]);
        }

        $payload['saved'] = true;
        $payload['item'] = $item->fresh();
        $payload['image_url'] = $url;

        return response()->json($payload);
    }

    /**
     * Prioriza los tres datos de referencia del catálogo (nombre, país, código/nº) y completa el resto con el OCR parseado.
     *
     * @param  array<string, mixed>  $ocr
     * @return array<string, mixed>
     */
    private function buildMergedCatalogForItem(FranchiseStamp $stamp, array $ocr): array
    {
        $pick = static function (?string $prefer, mixed $fallback): mixed {
            if ($prefer !== null && trim($prefer) !== '') {
                return trim($prefer);
            }
            if (is_string($fallback) && trim($fallback) !== '') {
                return trim($fallback);
            }

            return null;
        };

        $country = $pick($stamp->country_code, $ocr['country_code'] ?? null);
        if (is_string($country)) {
            $country = mb_strtoupper($country, 'UTF-8');
        }

        return [
            'player_name' => $pick($stamp->player_name, $ocr['player_name'] ?? null),
            'country_code' => $country,
            'external_code' => $pick($stamp->external_code, $ocr['album_number'] ?? null),
            'dob' => $pick($stamp->dob, $ocr['dob'] ?? null),
            'height' => $pick($stamp->height, $ocr['height'] ?? null),
            'weight' => $pick($stamp->weight, $ocr['weight'] ?? null),
            'stats_line' => $pick($stamp->stats_line, $ocr['stats_line'] ?? null),
            'club' => $pick($stamp->club, $ocr['club'] ?? null),
        ];
    }
}
