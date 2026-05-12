<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\GoogleIdTokenService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class GoogleAuthController extends Controller
{
    public function __construct(
        private GoogleIdTokenService $googleIdToken,
    ) {}

    public function register(Request $request)
    {
        $validated = $request->validate([
            'credential' => ['required', 'string'],
            'accepted_privacy' => ['required', Rule::in([true])],
        ]);

        $claims = $this->googleIdToken->verifyAndDecode($validated['credential']);
        if ($claims === null) {
            throw ValidationException::withMessages([
                'credential' => ['No se pudo verificar la cuenta de Google. Intenta de nuevo.'],
            ]);
        }

        if (User::where('google_id', $claims['sub'])->exists()) {
            throw ValidationException::withMessages([
                'credential' => ['Esta cuenta de Google ya está registrada. Inicia sesión.'],
            ]);
        }

        $existing = User::where('email', $claims['email'])->first();
        if ($existing !== null && $existing->google_id === null) {
            throw ValidationException::withMessages([
                'email' => ['Este correo ya está registrado con contraseña. Inicia sesión con email y contraseña o usa otro correo.'],
            ]);
        }

        $avatarPath = $this->storeGoogleAvatar($claims['picture']);

        $user = DB::transaction(function () use ($claims, $avatarPath) {
            return User::create([
                'name' => $claims['name'],
                'email' => $claims['email'],
                'google_id' => $claims['sub'],
                'password' => null,
                'avatar_path' => $avatarPath,
                'role' => 'cliente',
            ]);
        });

        $token = $user->createToken('cliente-token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $user->fresh(),
        ], 201);
    }

    public function login(Request $request)
    {
        $validated = $request->validate([
            'credential' => ['required', 'string'],
        ]);

        $claims = $this->googleIdToken->verifyAndDecode($validated['credential']);
        if ($claims === null) {
            throw ValidationException::withMessages([
                'credential' => ['No se pudo verificar la cuenta de Google. Intenta de nuevo.'],
            ]);
        }

        $user = User::where('google_id', $claims['sub'])->first();
        if ($user === null) {
            return response()->json([
                'message' => 'No encontramos una cuenta registrada con esta cuenta de Google. Regístrate primero en la pantalla de registro.',
                'code' => 'REGISTRATION_REQUIRED',
            ], 404);
        }

        $token = $user->createToken('cliente-token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $user,
        ]);
    }

    private function storeGoogleAvatar(?string $pictureUrl): ?string
    {
        if ($pictureUrl === null || $pictureUrl === '') {
            return null;
        }

        try {
            $response = Http::timeout(15)->withHeaders([
                'User-Agent' => 'ColeccionadorAPI/1.0',
            ])->get($pictureUrl);

            if (! $response->successful()) {
                return null;
            }

            $body = $response->body();
            if ($body === '' || strlen($body) > 6 * 1024 * 1024) {
                return null;
            }

            $path = 'avatars/'.Str::uuid()->toString().'.jpg';
            Storage::disk('public')->put($path, $body);

            return $path;
        } catch (\Throwable) {
            return null;
        }
    }
}
