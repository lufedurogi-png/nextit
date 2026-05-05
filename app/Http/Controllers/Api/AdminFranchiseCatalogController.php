<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Franchise;
use App\Models\FranchiseStamp;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class AdminFranchiseCatalogController extends Controller
{
    public function export(Request $request)
    {
        $request->validate([
            'password' => ['required', 'string'],
            'franchise_id' => ['required', 'integer', 'exists:franchises,id'],
        ]);

        $admin = $request->user();
        if (! $admin instanceof User || ! Hash::check($request->input('password'), $admin->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Contraseña de administrador incorrecta.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        $franchise = Franchise::query()->with('stamps')->findOrFail((int) $request->input('franchise_id'));
        $payload = [
            'meta' => [
                'type' => 'coleccionador-franchise-catalog',
                'version' => 1,
                'exported_at' => now()->toIso8601String(),
                'franchise' => [
                    'id' => $franchise->id,
                    'slug' => $franchise->slug,
                    'name' => $franchise->name,
                    'description' => $franchise->description,
                ],
                'exported_by' => [
                    'id' => $admin->id,
                    'name' => $admin->name,
                    'email' => $admin->email,
                ],
            ],
            'stamps' => $franchise->stamps->map(fn (FranchiseStamp $s) => [
                'id' => $s->id,
                'player_name' => $s->player_name,
                'country_code' => $s->country_code,
                'dob' => $s->dob,
                'height' => $s->height,
                'weight' => $s->weight,
                'stats_line' => $s->stats_line,
                'club' => $s->club,
                'external_code' => $s->external_code,
                'meta' => $s->meta,
            ])->values()->all(),
        ];

        $json = json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        $safeName = preg_replace('/[^a-zA-Z0-9_-]+/u', '_', $franchise->name) ?: 'franquicia';
        $filename = $safeName.'_'.now()->format('Ymd_His').'.json';

        return response($json, Response::HTTP_OK, [
            'Content-Type' => 'application/json; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }

    public function import(Request $request): JsonResponse
    {
        $request->validate([
            'password' => ['required', 'string'],
            'mode' => ['required', 'string', 'in:create,update'],
            'franchise_id' => ['required_if:mode,update', 'nullable', 'integer', 'exists:franchises,id'],
            'franchise_name' => ['required_if:mode,create', 'nullable', 'string', 'max:160'],
            'catalog_file' => ['required', 'file', 'mimes:json,txt', 'max:10240'],
        ]);

        $admin = $request->user();
        if (! $admin instanceof User || ! Hash::check($request->input('password'), $admin->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Contraseña de administrador incorrecta.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        $raw = (string) file_get_contents($request->file('catalog_file')->getRealPath());
        $decoded = json_decode($raw, true);
        if (! is_array($decoded) || ($decoded['meta']['type'] ?? null) !== 'coleccionador-franchise-catalog') {
            return response()->json([
                'success' => false,
                'message' => 'JSON inválido: se espera meta.type = coleccionador-franchise-catalog',
            ], 422);
        }
        if (! isset($decoded['stamps']) || ! is_array($decoded['stamps'])) {
            return response()->json([
                'success' => false,
                'message' => 'JSON sin arreglo stamps.',
            ], 422);
        }

        $report = DB::transaction(function () use ($decoded, $request) {
            $mode = $request->input('mode');
            if ($mode === 'create') {
                $name = (string) $request->input('franchise_name');
                $slugBase = Str::slug(Str::limit($name, 72, ''));
                $slug = $slugBase !== '' ? $slugBase : 'franquicia';
                if (Franchise::query()->where('slug', $slug)->exists()) {
                    $slug .= '-'.Str::lower(Str::random(6));
                }
                $franchise = Franchise::create([
                    'slug' => $slug,
                    'name' => $name,
                    'description' => $decoded['meta']['franchise']['description'] ?? null,
                ]);
            } else {
                $franchise = Franchise::query()->findOrFail((int) $request->input('franchise_id'));
                FranchiseStamp::query()->where('franchise_id', $franchise->id)->delete();
            }

            $inserted = 0;
            foreach ($decoded['stamps'] as $row) {
                if (! is_array($row)) {
                    continue;
                }
                FranchiseStamp::create([
                    'franchise_id' => $franchise->id,
                    'player_name' => isset($row['player_name']) ? (string) $row['player_name'] : null,
                    'country_code' => isset($row['country_code']) ? (string) $row['country_code'] : null,
                    'dob' => isset($row['dob']) ? (string) $row['dob'] : null,
                    'height' => isset($row['height']) ? (string) $row['height'] : null,
                    'weight' => isset($row['weight']) ? (string) $row['weight'] : null,
                    'stats_line' => isset($row['stats_line']) ? (string) $row['stats_line'] : null,
                    'club' => isset($row['club']) ? (string) $row['club'] : null,
                    'external_code' => isset($row['external_code']) ? (string) $row['external_code'] : null,
                    'meta' => isset($row['meta']) && is_array($row['meta']) ? $row['meta'] : null,
                ]);
                $inserted++;
            }

            return [
                'franchise_id' => $franchise->id,
                'franchise_slug' => $franchise->slug,
                'stamps_imported' => $inserted,
            ];
        });

        return response()->json([
            'success' => true,
            'message' => 'Catálogo importado.',
            'data' => $report,
        ]);
    }

    public function updateFranchise(Request $request, Franchise $franchise): JsonResponse
    {
        $data = $request->validate([
            'password' => ['required', 'string'],
            'name' => ['required', 'string', 'max:160'],
            'description' => ['nullable', 'string', 'max:500'],
        ]);

        $admin = $request->user();
        if (! $admin instanceof User || ! Hash::check($data['password'], $admin->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Contraseña de administrador incorrecta.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        $name = $data['name'];
        $slugBase = Str::slug(Str::limit($name, 72, ''));
        $slug = $slugBase !== '' ? $slugBase : $franchise->slug;
        if (Franchise::query()->where('slug', $slug)->where('id', '!=', $franchise->id)->exists()) {
            $slug .= '-'.Str::lower(Str::random(4));
        }

        $franchise->update([
            'name' => $name,
            'slug' => $slug,
            'description' => $data['description'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Franquicia actualizada.',
            'data' => $franchise->fresh(),
        ]);
    }

    public function destroyFranchise(Request $request, Franchise $franchise): JsonResponse
    {
        $request->validate([
            'password' => ['required', 'string'],
        ]);

        $admin = $request->user();
        if (! $admin instanceof User || ! Hash::check($request->input('password'), $admin->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Contraseña de administrador incorrecta.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        $franchise->delete();

        return response()->json([
            'success' => true,
            'message' => 'Franquicia eliminada.',
        ]);
    }
}
