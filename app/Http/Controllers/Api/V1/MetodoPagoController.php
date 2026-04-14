<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Support\MetodoPagoToggle;
use Illuminate\Http\JsonResponse;

class MetodoPagoController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => [
                'flags' => MetodoPagoToggle::flags(),
            ],
        ]);
    }
}

