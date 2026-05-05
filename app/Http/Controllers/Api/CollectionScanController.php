<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Collection;
use App\Models\CollectionItem;
use App\Models\FranchiseStamp;
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

        $payload = [
            'success' => true,
            'ocr' => $ocr,
            'match' => [
                'score' => $match['score'],
                'stamp' => $match['best'] ? [
                    'id' => $match['best']->id,
                    'player_name' => $match['best']->player_name,
                    'country_code' => $match['best']->country_code,
                    'club' => $match['best']->club,
                ] : null,
            ],
            'saved' => false,
            'item' => null,
            'duplicate_cooldown' => false,
        ];

        if (! $match['best']) {
            return response()->json($payload);
        }

        $recent = CollectionItem::query()
            ->where('collection_id', $collection->id)
            ->where('franchise_stamp_id', $match['best']->id)
            ->where('created_at', '>=', now()->subSeconds(12))
            ->exists();

        if ($recent) {
            $payload['duplicate_cooldown'] = true;

            return response()->json($payload);
        }

        $path = $file->store('uploads', 'public');
        $url = Storage::disk('public')->url($path);

        $stamp = $match['best'];
        // Datos mostrados al usuario = catálogo (BD), no el OCR crudo. El OCR se guarda aparte por si hace falta depurar.
        $description = json_encode([
            'matched_stamp_id' => $stamp->id,
            'score' => round((float) $match['score'], 1),
            'catalog' => [
                'player_name' => $stamp->player_name,
                'country_code' => $stamp->country_code,
                'dob' => $stamp->dob,
                'height' => $stamp->height,
                'weight' => $stamp->weight,
                'stats_line' => $stamp->stats_line,
                'club' => $stamp->club,
                'external_code' => $stamp->external_code,
            ],
            'ocr_reading' => $ocr,
        ], JSON_UNESCAPED_UNICODE) ?: '{}';

        $item = $collection->items()->create([
            'title' => $stamp->player_name ?: 'Estampa',
            'ref_number' => $stamp->external_code ?: (string) $stamp->id,
            'description' => $description,
            'quantity' => 1,
            'rarity_code' => 'C',
            'image_path' => $path,
            'source' => 'vision_scan',
            'franchise_stamp_id' => $stamp->id,
        ]);

        $payload['saved'] = true;
        $payload['item'] = $item->fresh();
        $payload['image_url'] = $url;

        return response()->json($payload);
    }
}
