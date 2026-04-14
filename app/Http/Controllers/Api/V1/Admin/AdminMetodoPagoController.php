<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Support\MetodoPagoToggle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class AdminMetodoPagoController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => MetodoPagoToggle::listForAdmin(),
        ]);
    }

    public function update(Request $request, string $codigo): JsonResponse
    {
        $codigo = strtolower(trim($codigo));
        if (! MetodoPagoToggle::exists($codigo)) {
            return response()->json([
                'success' => false,
                'message' => 'Método de pago no válido.',
            ], 422);
        }

        $valid = $request->validate([
            'active' => 'required|boolean',
            'password' => 'required|string',
        ]);

        $admin = Auth::user();
        if (! $admin || ! Hash::check($valid['password'], $admin->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Contraseña de administrador incorrecta.',
            ], 422);
        }

        MetodoPagoToggle::set($codigo, (bool) $valid['active'], (int) $admin->id);

        return response()->json([
            'success' => true,
            'message' => 'Configuración actualizada.',
            'data' => MetodoPagoToggle::listForAdmin(),
        ]);
    }
}

