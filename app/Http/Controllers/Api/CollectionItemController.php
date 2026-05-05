<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Collection;
use App\Models\CollectionItem;
use Illuminate\Http\Request;

class CollectionItemController extends Controller
{
    public function index(Request $request, Collection $collection)
    {
        abort_if((int) $collection->user_id !== (int) $request->user()->id, 403);

        return $collection->items()->latest()->get();
    }

    public function store(Request $request, Collection $collection)
    {
        abort_if((int) $collection->user_id !== (int) $request->user()->id, 403);

        $data = $request->validate([
            'title' => ['required', 'string', 'max:200'],
            'ref_number' => ['nullable', 'string', 'max:80'],
            'description' => ['nullable', 'string', 'max:5000'],
            'quantity' => ['required', 'integer', 'min:1'],
            'rarity_code' => ['required', 'string', 'in:C,U,R,SR,SSR,UR,SEC,PR'],
            'image_path' => ['nullable', 'string', 'max:500'],
        ]);

        $item = $collection->items()->create($data);

        return response()->json($item, 201);
    }

    public function update(Request $request, Collection $collection, CollectionItem $item)
    {
        abort_if((int) $collection->user_id !== (int) $request->user()->id, 403);
        abort_if((int) $item->collection_id !== (int) $collection->id, 404);

        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:200'],
            'ref_number' => ['sometimes', 'nullable', 'string', 'max:80'],
            'description' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'quantity' => ['sometimes', 'integer', 'min:1'],
            'rarity_code' => ['sometimes', 'string', 'in:C,U,R,SR,SSR,UR,SEC,PR'],
            'image_path' => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);

        $item->update($data);

        return $item->fresh();
    }

    public function destroy(Request $request, Collection $collection, CollectionItem $item)
    {
        abort_if((int) $collection->user_id !== (int) $request->user()->id, 403);
        abort_if((int) $item->collection_id !== (int) $collection->id, 404);
        $item->delete();

        return response()->json(['ok' => true]);
    }
}
