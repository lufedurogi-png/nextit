<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Collection;
use Illuminate\Http\Request;

class CollectionController extends Controller
{
    public function index(Request $request)
    {
        return Collection::query()
            ->where('user_id', $request->user()->id)
            ->withCount('items')
            ->latest()
            ->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'accent_color' => ['nullable', 'string', 'max:16'],
            'category' => ['nullable', 'string', 'max:120'],
            'brand' => ['nullable', 'string', 'max:120'],
            'cover_path' => ['nullable', 'string', 'max:500'],
            'franchise_id' => ['nullable', 'integer', 'exists:franchises,id'],
        ]);

        $collection = Collection::create([
            ...$data,
            'user_id' => $request->user()->id,
            'accent_color' => $data['accent_color'] ?? '#6366f1',
        ]);

        return response()->json($collection, 201);
    }

    public function show(Request $request, Collection $collection)
    {
        $this->authorizeOwner($request, $collection);

        return $collection->load('items');
    }

    public function update(Request $request, Collection $collection)
    {
        $this->authorizeOwner($request, $collection);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'accent_color' => ['sometimes', 'string', 'max:16'],
            'category' => ['sometimes', 'nullable', 'string', 'max:120'],
            'brand' => ['sometimes', 'nullable', 'string', 'max:120'],
            'cover_path' => ['sometimes', 'nullable', 'string', 'max:500'],
            'franchise_id' => ['sometimes', 'nullable', 'integer', 'exists:franchises,id'],
        ]);

        $collection->update($data);

        return $collection->fresh();
    }

    public function destroy(Request $request, Collection $collection)
    {
        $this->authorizeOwner($request, $collection);
        $collection->delete();

        return response()->json(['ok' => true]);
    }

    private function authorizeOwner(Request $request, Collection $collection): void
    {
        abort_if((int) $collection->user_id !== (int) $request->user()->id, 403);
    }
}
