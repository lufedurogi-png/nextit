<?php

namespace App\Http\Controllers\Api\V1\Ventas;

use App\Http\Controllers\Controller;
use App\Mail\VentasCorreoMasivoMail;
use App\Models\VentasCorreoDestinatario;
use App\Models\VentasCorreoGrupo;
use App\Models\VentasCorreoEnvio;
use App\Models\VentasCorreoEnvioAdjunto;
use App\Models\VentasCorreoEnvioDestinatario;
use App\Models\VentasCorreoPlantilla;
use App\Support\VentasCorreoAdjuntoRules;
use App\Support\VentasCorreoHtmlSanitizer;
use App\Support\VentasCorreoPersonalizacion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class VentasCorreoController extends Controller
{
    public function indexGrupos(): JsonResponse
    {
        $rows = VentasCorreoGrupo::query()
            ->where('user_id', Auth::id())
            ->withCount('destinatarios')
            ->orderBy('nombre')
            ->get()
            ->map(fn (VentasCorreoGrupo $g) => $this->mapGrupo($g));

        return response()->json(['success' => true, 'data' => $rows]);
    }

    public function storeGrupo(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nombre' => ['required', 'string', 'max:200'],
        ]);

        $nombre = trim($validated['nombre']);
        $duplicado = VentasCorreoGrupo::query()
            ->where('user_id', Auth::id())
            ->where('nombre', $nombre)
            ->exists();

        if ($duplicado) {
            return response()->json([
                'success' => false,
                'message' => 'Ya tienes un grupo con ese nombre.',
            ], 422);
        }

        $grupo = VentasCorreoGrupo::create([
            'user_id' => Auth::id(),
            'nombre' => $nombre,
        ]);

        return response()->json([
            'success' => true,
            'data' => $this->mapGrupo($grupo->loadCount('destinatarios')),
        ], 201);
    }

    public function updateGrupo(Request $request, int $id): JsonResponse
    {
        $grupo = VentasCorreoGrupo::query()
            ->where('user_id', Auth::id())
            ->whereKey($id)
            ->firstOrFail();

        $validated = $request->validate([
            'nombre' => ['required', 'string', 'max:200'],
        ]);

        $nombre = trim($validated['nombre']);
        $duplicado = VentasCorreoGrupo::query()
            ->where('user_id', Auth::id())
            ->where('nombre', $nombre)
            ->whereKeyNot($grupo->id)
            ->exists();

        if ($duplicado) {
            return response()->json([
                'success' => false,
                'message' => 'Ya tienes otro grupo con ese nombre.',
            ], 422);
        }

        $grupo->update(['nombre' => $nombre]);

        return response()->json([
            'success' => true,
            'data' => $this->mapGrupo($grupo->fresh()->loadCount('destinatarios')),
        ]);
    }

    public function destroyGrupo(int $id): JsonResponse
    {
        $grupo = VentasCorreoGrupo::query()
            ->where('user_id', Auth::id())
            ->whereKey($id)
            ->firstOrFail();

        VentasCorreoDestinatario::query()
            ->where('ventas_correo_grupo_id', $grupo->id)
            ->delete();

        $grupo->delete();

        return response()->json([
            'success' => true,
            'message' => 'Grupo eliminado junto con sus contactos.',
        ]);
    }

    public function indexDestinatarios(): JsonResponse
    {
        $rows = VentasCorreoDestinatario::query()
            ->where('user_id', Auth::id())
            ->with('grupo')
            ->orderBy('nombre')
            ->orderBy('email')
            ->get()
            ->map(fn (VentasCorreoDestinatario $d) => $this->mapDestinatario($d));

        return response()->json(['success' => true, 'data' => $rows]);
    }

    public function storeDestinatario(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email:rfc', 'max:255'],
            'nombre' => ['nullable', 'string', 'max:200'],
            'grupo_id' => ['required', 'integer'],
        ]);

        $grupo = VentasCorreoGrupo::query()
            ->where('user_id', Auth::id())
            ->whereKey((int) $validated['grupo_id'])
            ->first();

        if (! $grupo) {
            return response()->json([
                'success' => false,
                'message' => 'El grupo seleccionado no es válido.',
            ], 422);
        }

        $email = mb_strtolower(trim($validated['email']));
        $nombre = isset($validated['nombre']) ? trim((string) $validated['nombre']) : '';
        $nombre = $nombre !== '' ? $nombre : null;

        $existente = VentasCorreoDestinatario::query()
            ->where('user_id', Auth::id())
            ->where('email', $email)
            ->first();

        if ($existente) {
            $existente->update([
                'ventas_correo_grupo_id' => $grupo->id,
                'nombre' => $nombre ?? $existente->nombre,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Este correo ya estaba registrado; se movió al grupo seleccionado.',
                'data' => $this->mapDestinatario($existente->fresh()->load('grupo')),
            ]);
        }

        $destinatario = VentasCorreoDestinatario::create([
            'user_id' => Auth::id(),
            'ventas_correo_grupo_id' => $grupo->id,
            'email' => $email,
            'nombre' => $nombre,
        ]);

        return response()->json([
            'success' => true,
            'data' => $this->mapDestinatario($destinatario->load('grupo')),
        ], 201);
    }

    public function destroyDestinatario(int $id): JsonResponse
    {
        $destinatario = VentasCorreoDestinatario::query()
            ->where('user_id', Auth::id())
            ->whereKey($id)
            ->firstOrFail();

        $destinatario->delete();

        return response()->json(['success' => true]);
    }

    public function indexPlantillas(): JsonResponse
    {
        $rows = VentasCorreoPlantilla::query()
            ->where('user_id', Auth::id())
            ->orderBy('nombre')
            ->get()
            ->map(fn (VentasCorreoPlantilla $p) => $this->mapPlantilla($p));

        return response()->json(['success' => true, 'data' => $rows]);
    }

    public function storePlantilla(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nombre' => ['required', 'string', 'max:80'],
            'cuerpo_html' => ['required', 'string', 'max:50000'],
        ]);

        $nombre = trim($validated['nombre']);
        $cuerpo = VentasCorreoHtmlSanitizer::sanitize($validated['cuerpo_html']);

        if (! VentasCorreoHtmlSanitizer::tieneContenido($cuerpo)) {
            return response()->json([
                'success' => false,
                'message' => 'Escribe el contenido del mensaje preescrito.',
            ], 422);
        }

        if (VentasCorreoPlantilla::query()->where('user_id', Auth::id())->where('nombre', $nombre)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Ya tienes un mensaje preescrito con ese nombre.',
            ], 422);
        }

        $plantilla = VentasCorreoPlantilla::create([
            'user_id' => Auth::id(),
            'nombre' => $nombre,
            'cuerpo_html' => $cuerpo,
        ]);

        return response()->json([
            'success' => true,
            'data' => $this->mapPlantilla($plantilla),
        ], 201);
    }

    public function updatePlantilla(Request $request, int $id): JsonResponse
    {
        $plantilla = VentasCorreoPlantilla::query()
            ->where('user_id', Auth::id())
            ->whereKey($id)
            ->firstOrFail();

        $validated = $request->validate([
            'nombre' => ['required', 'string', 'max:80'],
            'cuerpo_html' => ['required', 'string', 'max:50000'],
        ]);

        $nombre = trim($validated['nombre']);
        $cuerpo = VentasCorreoHtmlSanitizer::sanitize($validated['cuerpo_html']);

        if (! VentasCorreoHtmlSanitizer::tieneContenido($cuerpo)) {
            return response()->json([
                'success' => false,
                'message' => 'Escribe el contenido del mensaje preescrito.',
            ], 422);
        }

        $duplicado = VentasCorreoPlantilla::query()
            ->where('user_id', Auth::id())
            ->where('nombre', $nombre)
            ->whereKeyNot($plantilla->id)
            ->exists();

        if ($duplicado) {
            return response()->json([
                'success' => false,
                'message' => 'Ya tienes otro mensaje preescrito con ese nombre.',
            ], 422);
        }

        $plantilla->update([
            'nombre' => $nombre,
            'cuerpo_html' => $cuerpo,
        ]);

        return response()->json([
            'success' => true,
            'data' => $this->mapPlantilla($plantilla->fresh()),
        ]);
    }

    public function destroyPlantilla(int $id): JsonResponse
    {
        $plantilla = VentasCorreoPlantilla::query()
            ->where('user_id', Auth::id())
            ->whereKey($id)
            ->firstOrFail();

        $plantilla->delete();

        return response()->json([
            'success' => true,
            'message' => 'Mensaje preescrito eliminado.',
        ]);
    }

    public function indexHistorial(Request $request): JsonResponse
    {
        $perPage = min(50, max(1, (int) $request->query('per_page', 6)));
        $page = max(1, (int) $request->query('page', 1));

        $query = VentasCorreoEnvio::query()
            ->where('user_id', Auth::id())
            ->with(['destinatarios', 'adjuntos']);

        $buscar = trim((string) $request->query('q', ''));
        if ($buscar !== '') {
            $like = '%'.$buscar.'%';
            $query->where(function ($w) use ($like) {
                $w->where('asunto', 'like', $like)
                    ->orWhere('cuerpo', 'like', $like)
                    ->orWhereHas('destinatarios', function ($d) use ($like) {
                        $d->where('email', 'like', $like)
                            ->orWhere('nombre', 'like', $like);
                    });
            });
        }

        if ($request->filled('anio')) {
            $query->whereYear('created_at', (int) $request->query('anio'));
        }
        if ($request->filled('mes')) {
            $mes = (int) $request->query('mes');
            if ($mes >= 1 && $mes <= 12) {
                $query->whereMonth('created_at', $mes);
            }
        }
        if ($request->filled('dia')) {
            $dia = (int) $request->query('dia');
            if ($dia >= 1 && $dia <= 31) {
                $query->whereDay('created_at', $dia);
            }
        }

        $paginator = $query
            ->orderByDesc('created_at')
            ->paginate($perPage, ['*'], 'page', $page);

        $data = $paginator->getCollection()
            ->map(fn (VentasCorreoEnvio $e) => $this->mapEnvio($e, false))
            ->all();

        return response()->json([
            'success' => true,
            'data' => [
                'envios' => $data,
                'total' => $paginator->total(),
                'per_page' => $paginator->perPage(),
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
            ],
        ]);
    }

    public function showHistorial(int $id): JsonResponse
    {
        $envio = VentasCorreoEnvio::query()
            ->where('user_id', Auth::id())
            ->with(['destinatarios', 'adjuntos'])
            ->find($id);

        if (! $envio) {
            return response()->json(['success' => false, 'message' => 'Envío no encontrado.'], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $this->mapEnvio($envio, true),
        ]);
    }

    public function destroyHistorial(int $id): JsonResponse
    {
        $envio = VentasCorreoEnvio::query()
            ->where('user_id', Auth::id())
            ->with('adjuntos')
            ->find($id);

        if (! $envio) {
            return response()->json(['success' => false, 'message' => 'Envío no encontrado.'], 404);
        }

        $directorio = 'ventas-correos/'.$envio->user_id.'/'.$envio->id;
        foreach ($envio->adjuntos as $adjunto) {
            if ($adjunto->ruta !== '') {
                Storage::disk('local')->delete($adjunto->ruta);
            }
        }
        Storage::disk('local')->deleteDirectory($directorio);

        $envio->delete();

        return response()->json([
            'success' => true,
            'message' => 'Envío eliminado del historial.',
        ]);
    }

    public function send(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'asunto' => ['required', 'string', 'max:255'],
            'cuerpo' => ['required', 'string', 'max:500000'],
            'destinatario_ids' => ['required', 'array', 'min:1'],
            'destinatario_ids.*' => ['integer'],
            'adjuntos' => ['nullable', 'array'],
            'adjuntos.*' => ['file'],
            'imagenes_inline' => ['nullable', 'array', 'max:'.VentasCorreoAdjuntoRules::MAX_IMAGENES_INLINE],
            'imagenes_inline.*' => ['file'],
        ]);

        $validator->after(function ($v) use ($request) {
            $adjuntos = $request->file('adjuntos', []);
            if (is_array($adjuntos)) {
                foreach ($adjuntos as $i => $file) {
                    if ($file instanceof UploadedFile) {
                        VentasCorreoAdjuntoRules::validarArchivo($file, $v, "adjuntos.{$i}");
                    }
                }
            }
            $inline = $request->file('imagenes_inline', []);
            if (is_array($inline)) {
                foreach ($inline as $i => $file) {
                    if ($file instanceof UploadedFile) {
                        VentasCorreoAdjuntoRules::validarImagenInline($file, $v, "imagenes_inline.{$i}");
                    }
                }
            }
        });

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first() ?: 'Datos inválidos.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();
        $cuerpoHtml = VentasCorreoHtmlSanitizer::sanitize((string) $validated['cuerpo']);
        if (! VentasCorreoHtmlSanitizer::tieneContenido($cuerpoHtml)) {
            return response()->json([
                'success' => false,
                'message' => 'Escribe el cuerpo del mensaje o agrega al menos una imagen.',
            ], 422);
        }

        $ids = array_values(array_unique(array_map('intval', $validated['destinatario_ids'])));

        $destinatarios = VentasCorreoDestinatario::query()
            ->where('user_id', Auth::id())
            ->whereIn('id', $ids)
            ->get();

        if ($destinatarios->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'No hay destinatarios válidos seleccionados.',
            ], 422);
        }

        $remitente = Auth::user()?->name;
        $asunto = trim($validated['asunto']);
        $archivos = $request->file('adjuntos', []);
        if (! is_array($archivos)) {
            $archivos = [];
        }
        $imagenesInline = $request->file('imagenes_inline', []);
        if (! is_array($imagenesInline)) {
            $imagenesInline = [];
        }

        $envio = VentasCorreoEnvio::create([
            'user_id' => Auth::id(),
            'asunto' => $asunto,
            'cuerpo' => $cuerpoHtml,
            'enviados_count' => 0,
            'fallidos_count' => 0,
        ]);

        $adjuntosMail = [];
        $inlineMail = [];
        $directorio = 'ventas-correos/'.$envio->user_id.'/'.$envio->id;

        foreach ($imagenesInline as $file) {
            if (! $file instanceof UploadedFile) {
                continue;
            }
            $nombreOriginal = $file->getClientOriginalName();
            $ruta = $file->store($directorio.'/inline', 'local');
            VentasCorreoEnvioAdjunto::create([
                'ventas_correo_envio_id' => $envio->id,
                'tipo' => 'inline',
                'nombre_original' => $nombreOriginal,
                'ruta' => $ruta,
                'mime_type' => $file->getMimeType(),
                'tamano_bytes' => (int) $file->getSize(),
            ]);
            $inlineMail[] = [
                'path' => Storage::disk('local')->path($ruta),
                'mime' => $file->getMimeType(),
            ];
        }

        foreach ($archivos as $file) {
            if (! $file instanceof UploadedFile) {
                continue;
            }
            $nombreOriginal = $file->getClientOriginalName();
            $ruta = $file->store($directorio, 'local');
            VentasCorreoEnvioAdjunto::create([
                'ventas_correo_envio_id' => $envio->id,
                'tipo' => 'adjunto',
                'nombre_original' => $nombreOriginal,
                'ruta' => $ruta,
                'mime_type' => $file->getMimeType(),
                'tamano_bytes' => (int) $file->getSize(),
            ]);
            $adjuntosMail[] = [
                'path' => Storage::disk('local')->path($ruta),
                'name' => $nombreOriginal,
            ];
        }

        $enviados = 0;
        $fallidos = [];
        $primerErrorEnvio = null;

        foreach ($destinatarios as $destinatario) {
            try {
                $cuerpoParaDestinatario = VentasCorreoPersonalizacion::personalizar(
                    $cuerpoHtml,
                    $destinatario->nombre,
                    $destinatario->email,
                );

                Mail::to($destinatario->email)->send(new VentasCorreoMasivoMail(
                    $asunto,
                    $cuerpoParaDestinatario,
                    $remitente,
                    $adjuntosMail,
                    $inlineMail,
                ));
                VentasCorreoEnvioDestinatario::create([
                    'ventas_correo_envio_id' => $envio->id,
                    'ventas_correo_destinatario_id' => $destinatario->id,
                    'email' => $destinatario->email,
                    'nombre' => $destinatario->nombre,
                    'estado' => 'enviado',
                ]);
                $enviados++;
            } catch (\Throwable $e) {
                report($e);
                if ($primerErrorEnvio === null) {
                    $primerErrorEnvio = $e;
                }
                $msg = mb_substr($e->getMessage(), 0, 400);
                VentasCorreoEnvioDestinatario::create([
                    'ventas_correo_envio_id' => $envio->id,
                    'ventas_correo_destinatario_id' => $destinatario->id,
                    'email' => $destinatario->email,
                    'nombre' => $destinatario->nombre,
                    'estado' => 'fallido',
                    'error_mensaje' => $msg !== '' ? $msg : 'No se pudo enviar a este correo.',
                ]);
                $fallidos[] = [
                    'id' => $destinatario->id,
                    'email' => $destinatario->email,
                    'error' => $msg !== '' ? $msg : 'No se pudo enviar a este correo.',
                ];
            }
        }

        $envio->update([
            'enviados_count' => $enviados,
            'fallidos_count' => count($fallidos),
        ]);

        if ($enviados === 0) {
            return response()->json([
                'success' => false,
                'message' => $primerErrorEnvio
                    ? self::mensajeErrorEnvio($primerErrorEnvio)
                    : 'No se pudo enviar ningún correo. Revisa la configuración MAIL_* en el servidor.',
                'data' => [
                    'envio_id' => $envio->id,
                    'enviados' => 0,
                    'fallidos' => $fallidos,
                ],
            ], 500);
        }

        $mensaje = $enviados === 1
            ? 'Correo enviado correctamente.'
            : "Correos enviados: {$enviados}.";

        if (count($fallidos) > 0) {
            $mensaje .= ' Algunos destinatarios no recibieron el mensaje.';
        }

        return response()->json([
            'success' => true,
            'message' => $mensaje,
            'data' => [
                'envio_id' => $envio->id,
                'enviados' => $enviados,
                'fallidos' => $fallidos,
            ],
        ]);
    }

    private static function mensajeErrorEnvio(\Throwable $e): string
    {
        $m = $e->getMessage();

        if (str_contains($m, '535') || str_contains($m, 'BadCredentials') || str_contains($m, 'Authentication failed')) {
            return 'Gmail rechazó usuario o contraseña. Usa una contraseña de aplicación de 16 caracteres en MAIL_PASSWORD (no la contraseña normal de la cuenta) y reinicia php artisan serve.';
        }

        if (str_contains($m, 'Connection could not be established') || str_contains($m, 'Unable to connect')) {
            return 'No se pudo conectar a Gmail (smtp.gmail.com). Revisa firewall/antivirus, prueba otra red o en .env usa MAIL_PORT=465 y MAIL_SCHEME=smtps. Luego ejecuta: php artisan config:clear y reinicia el servidor.';
        }

        return 'No se pudo enviar el correo: '.mb_substr($m, 0, 200);
    }

    /**
     * @return array<string, mixed>
     */
    private function mapGrupo(VentasCorreoGrupo $g): array
    {
        return [
            'id' => $g->id,
            'nombre' => $g->nombre,
            'destinatarios_count' => (int) ($g->destinatarios_count ?? $g->destinatarios()->count()),
            'created_at' => $g->created_at?->toIso8601String(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function mapDestinatario(VentasCorreoDestinatario $d): array
    {
        return [
            'id' => $d->id,
            'grupo_id' => $d->ventas_correo_grupo_id,
            'grupo_nombre' => $d->grupo?->nombre,
            'email' => $d->email,
            'nombre' => $d->nombre,
            'created_at' => $d->created_at?->toIso8601String(),
        ];
    }

  /**
     * @return array<string, mixed>
     */
    private function mapEnvio(VentasCorreoEnvio $e, bool $conCuerpo): array
    {
        $row = [
            'id' => $e->id,
            'asunto' => $e->asunto,
            'enviados_count' => (int) $e->enviados_count,
            'fallidos_count' => (int) $e->fallidos_count,
            'fecha' => $e->created_at?->toIso8601String(),
            'destinatarios' => $e->destinatarios->map(fn (VentasCorreoEnvioDestinatario $d) => [
                'email' => $d->email,
                'nombre' => $d->nombre,
                'estado' => $d->estado,
                'error_mensaje' => $d->error_mensaje,
            ])->all(),
            'adjuntos' => $e->adjuntos->where('tipo', 'adjunto')->values()->map(fn (VentasCorreoEnvioAdjunto $a) => [
                'id' => $a->id,
                'nombre' => $a->nombre_original,
                'tamano_bytes' => (int) $a->tamano_bytes,
                'mime_type' => $a->mime_type,
                'tipo' => $a->tipo,
            ])->all(),
            'imagenes_inline' => $this->mapImagenesInline($e, $conCuerpo),
        ];

        if ($conCuerpo) {
            $row['cuerpo'] = $e->cuerpo;
            $row['cuerpo_es_html'] = str_contains($e->cuerpo, '<');
            $row['cuerpo_html_vista'] = $this->htmlVistaHistorial($e->cuerpo, $row['imagenes_inline']);
        } else {
            $textoPlano = trim(strip_tags(preg_replace('/\[\[IMG:\d+\]\]/', ' ', $e->cuerpo) ?? $e->cuerpo));
            $preview = mb_substr($textoPlano, 0, 160);
            if (mb_strlen($textoPlano) > 160) {
                $preview .= '…';
            }
            $row['cuerpo_preview'] = $preview !== '' ? $preview : '(mensaje con imágenes)';
        }

        return $row;
    }

    /**
     * @return array<string, mixed>
     */
    private function mapPlantilla(VentasCorreoPlantilla $p): array
    {
        return [
            'id' => $p->id,
            'nombre' => $p->nombre,
            'cuerpo_html' => $p->cuerpo_html,
            'created_at' => $p->created_at?->toIso8601String(),
            'updated_at' => $p->updated_at?->toIso8601String(),
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function mapImagenesInline(VentasCorreoEnvio $e, bool $conPreview): array
    {
        return $e->adjuntos
            ->where('tipo', 'inline')
            ->sortBy('id')
            ->values()
            ->map(function (VentasCorreoEnvioAdjunto $a, int $indice) use ($conPreview) {
                $item = [
                    'id' => $a->id,
                    'indice' => $indice,
                    'nombre' => $a->nombre_original,
                    'tamano_bytes' => (int) $a->tamano_bytes,
                    'mime_type' => $a->mime_type,
                ];

                if (! $conPreview) {
                    return $item;
                }

                $path = Storage::disk('local')->path($a->ruta);
                if (! is_readable($path) || $a->tamano_bytes > 2_000_000) {
                    return $item;
                }

                $contenido = file_get_contents($path);
                if ($contenido === false) {
                    return $item;
                }

                $mime = $a->mime_type ?: (mime_content_type($path) ?: 'image/jpeg');
                $item['preview_url'] = 'data:'.$mime.';base64,'.base64_encode($contenido);

                return $item;
            })
            ->all();
    }

    /**
     * @param  list<array<string, mixed>>  $imagenesInline
     */
    private function htmlVistaHistorial(string $cuerpo, array $imagenesInline): string
    {
        $html = $cuerpo;

        foreach ($imagenesInline as $img) {
            $i = (int) ($img['indice'] ?? 0);
            $url = $img['preview_url'] ?? '';
            if ($url === '') {
                continue;
            }
            $etiqueta = '<img src="'.htmlspecialchars($url, ENT_QUOTES, 'UTF-8').'" alt="" style="max-width:100%;height:auto;display:block;margin:12px auto;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.12);" />';
            $html = str_replace('[[IMG:'.$i.']]', $etiqueta, $html);
        }

        return preg_replace('/\[\[IMG:\d+\]\]/', '', $html) ?? $html;
    }
}
