<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Symfony\Component\HttpFoundation\Response;

class AdminBackupController extends Controller
{
    private const EXCLUDED_TABLES = [
        'productos_cva',
    ];

    public function previewExport(): JsonResponse
    {
        $tables = $this->getBackupTableList();
        $summary = [];
        foreach ($tables as $table) {
            $columns = Schema::getColumnListing($table);
            $count = DB::table($table)->count();
            $summary[] = [
                'table' => $table,
                'columns' => $columns,
                'rows' => $count,
            ];
        }

        return response()->json([
            'success' => true,
            'data' => [
                'generated_at' => now()->toIso8601String(),
                'excluded_tables' => self::EXCLUDED_TABLES,
                'tables' => $summary,
            ],
        ], Response::HTTP_OK);
    }

    public function export(Request $request)
    {
        $request->validate([
            'password' => ['required', 'string'],
        ]);

        $admin = Auth::user();
        if (! $admin || ! Hash::check($request->input('password'), $admin->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Contraseña de administrador incorrecta.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        $tables = $this->getBackupTableList();
        $payload = [
            'meta' => [
                'type' => 'nxtit-backup',
                'version' => 1,
                'generated_at' => now()->toIso8601String(),
                'generated_by' => [
                    'id' => $admin->id,
                    'name' => $admin->name,
                    'email' => $admin->email,
                ],
                'excluded_tables' => self::EXCLUDED_TABLES,
            ],
            'tables' => [],
        ];

        foreach ($tables as $table) {
            $query = DB::table($table);
            if (Schema::hasColumn($table, 'id')) {
                $query->orderBy('id');
            }
            $rows = $query->get()->map(fn ($row) => (array) $row)->values()->all();
            $payload['tables'][$table] = $rows;
        }

        $json = json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        $filename = 'respaldo_bd_'.now()->format('Ymd_His').'.json';

        return response($json, Response::HTTP_OK, [
            'Content-Type' => 'application/json; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    public function import(Request $request): JsonResponse
    {
        $request->validate([
            'password' => ['required', 'string'],
            'backup_file' => ['required', 'file', 'mimes:json,txt', 'max:51200'],
        ]);

        $admin = Auth::user();
        if (! $admin || ! Hash::check($request->input('password'), $admin->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Contraseña de administrador incorrecta.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        $raw = file_get_contents($request->file('backup_file')->getRealPath());
        $decoded = json_decode($raw, true);
        if (! is_array($decoded) || ! isset($decoded['tables']) || ! is_array($decoded['tables'])) {
            return response()->json([
                'success' => false,
                'message' => 'Archivo JSON inválido o sin estructura de respaldo.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $report = [
            'started_at' => now()->toIso8601String(),
            'updated_by' => [
                'id' => $admin->id,
                'name' => $admin->name,
                'email' => $admin->email,
            ],
            'tables' => [],
            'totals' => [
                'inserted' => 0,
                'updated' => 0,
                'skipped' => 0,
                'compared' => 0,
            ],
        ];

        foreach ($decoded['tables'] as $table => $rows) {
            if (! is_string($table) || in_array($table, self::EXCLUDED_TABLES, true)) {
                continue;
            }
            if (! Schema::hasTable($table) || ! is_array($rows)) {
                $report['tables'][] = [
                    'table' => $table,
                    'compared' => 0,
                    'inserted' => 0,
                    'updated' => 0,
                    'skipped' => is_array($rows) ? count($rows) : 0,
                    'notes' => ['Tabla inexistente o datos inválidos.'],
                ];
                $report['totals']['skipped'] += is_array($rows) ? count($rows) : 0;
                continue;
            }

            $columns = Schema::getColumnListing($table);
            $hasId = in_array('id', $columns, true);

            $tableReport = [
                'table' => $table,
                'compared' => 0,
                'inserted' => 0,
                'updated' => 0,
                'skipped' => 0,
                'notes' => [],
            ];

            foreach ($rows as $row) {
                if (! is_array($row)) {
                    $tableReport['skipped']++;
                    $tableReport['notes'][] = 'Fila inválida (no objeto).';
                    continue;
                }

                $tableReport['compared']++;
                $report['totals']['compared']++;

                $filtered = [];
                foreach ($row as $key => $value) {
                    if (in_array($key, $columns, true)) {
                        $filtered[$key] = $value;
                    }
                }

                if (empty($filtered)) {
                    $tableReport['skipped']++;
                    $report['totals']['skipped']++;
                    continue;
                }

                try {
                    if ($hasId && array_key_exists('id', $filtered) && $filtered['id'] !== null) {
                        $id = $filtered['id'];
                        $exists = DB::table($table)->where('id', $id)->exists();
                        if ($exists) {
                            $toUpdate = $filtered;
                            unset($toUpdate['id']);
                            if (! empty($toUpdate)) {
                                DB::table($table)->where('id', $id)->update($toUpdate);
                            }
                            $tableReport['updated']++;
                            $report['totals']['updated']++;
                        } else {
                            DB::table($table)->insert($filtered);
                            $tableReport['inserted']++;
                            $report['totals']['inserted']++;
                        }
                    } else {
                        DB::table($table)->insert($filtered);
                        $tableReport['inserted']++;
                        $report['totals']['inserted']++;
                    }
                } catch (\Throwable $e) {
                    // Si falta relación (o cualquier constraint), se omite la fila para no romper la carga.
                    $tableReport['skipped']++;
                    $report['totals']['skipped']++;
                    if (count($tableReport['notes']) < 20) {
                        $tableReport['notes'][] = 'Fila omitida por restricción/relación: '.$e->getMessage();
                    }
                }
            }

            $report['tables'][] = $tableReport;
        }

        $report['finished_at'] = now()->toIso8601String();

        return response()->json([
            'success' => true,
            'message' => 'Importación procesada.',
            'data' => $report,
        ], Response::HTTP_OK);
    }

    /**
     * @return list<string>
     */
    private function getBackupTableList(): array
    {
        $allTables = Schema::getTableListing();
        return collect($allTables)
            ->filter(fn ($t) => is_string($t) && ! in_array($t, self::EXCLUDED_TABLES, true))
            ->values()
            ->all();
    }
}
