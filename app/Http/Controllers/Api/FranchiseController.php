<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Franchise;
use Illuminate\Http\JsonResponse;

class FranchiseController extends Controller
{
    public function index(): JsonResponse
    {
        $rows = Franchise::query()
            ->withCount('stamps')
            ->orderBy('name')
            ->get(['id', 'name', 'slug', 'description']);

        return response()->json($rows);
    }
}
