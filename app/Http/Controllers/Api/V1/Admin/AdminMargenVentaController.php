<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Services\MargenVentaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AdminMargenVentaController extends Controller
{
    public function __construct(
        private readonly MargenVentaService $margenVenta,
    ) {}

    public function show(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => [
                'porcentaje' => $this->margenVenta->getPorcentaje(),
            ],
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $valid = $request->validate([
            'password' => 'required|string',
            'porcentaje' => 'required|numeric|between:-99.99,999.99',
        ]);

        $admin = $request->user();
        if (! $admin || ! Hash::check($valid['password'], $admin->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Contraseña incorrecta.',
            ], 403);
        }

        $this->margenVenta->setPorcentaje((float) $valid['porcentaje']);

        return response()->json([
            'success' => true,
            'message' => 'Margen global actualizado.',
            'data' => [
                'porcentaje' => $this->margenVenta->getPorcentaje(),
            ],
        ]);
    }

    public function reset(Request $request): JsonResponse
    {
        $valid = $request->validate([
            'password' => 'required|string',
        ]);

        $admin = $request->user();
        if (! $admin || ! Hash::check($valid['password'], $admin->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Contraseña incorrecta.',
            ], 403);
        }

        $this->margenVenta->setPorcentaje(0.0);

        return response()->json([
            'success' => true,
            'message' => 'Precios de venta alineados con el precio base (0% de margen).',
            'data' => [
                'porcentaje' => 0.0,
            ],
        ]);
    }
}
