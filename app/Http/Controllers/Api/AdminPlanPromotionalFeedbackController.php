<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PlanPromotionalFeedback;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminPlanPromotionalFeedbackController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $per = min(100, max(5, (int) $request->query('per_page', 50)));

        $paginator = PlanPromotionalFeedback::query()
            ->with('user:id,name,email')
            ->orderByDesc('id')
            ->paginate($per);

        return response()->json([
            'success' => true,
            'data' => $paginator,
        ]);
    }
}
