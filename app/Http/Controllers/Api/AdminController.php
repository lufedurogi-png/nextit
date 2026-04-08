<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    public function home(Request $request)
    {
        return response()->json([
            'message' => 'Bienvenido al panel de administración',
            'admin' => $request->user(),
            'stats' => [
                'usuarios' => 0,
                'cartas' => 0,
            ],
        ]);
    }
}
