<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Mail\CotizacionInvitadoMail;
use App\Models\CotizacionInvitado;
use App\Support\DocumentoNumeracion;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

class CotizacionInvitadoPublicController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $valid = $request->validate([
            'email' => 'required|email:rfc|max:255',
            'privacy_accepted' => 'required|accepted',
            'items' => 'required|array',
            'items.*.clave' => 'required|string|max:100',
            'items.*.cantidad' => 'required|integer|min:1|max:9999',
            'items.*.nombre_producto' => 'required|string|max:500',
            'items.*.precio_unitario' => 'required|numeric|min:0',
            'items.*.imagen' => 'nullable|string|max:1000',
        ]);

        $items = array_values(array_filter($valid['items'], fn ($i) => ! empty($i['clave']) && (int) ($i['cantidad'] ?? 0) > 0));

        if (empty($items)) {
            return response()->json([
                'success' => false,
                'message' => 'Debe incluir al menos un ítem.',
            ], 422);
        }

        $total = 0;
        foreach ($items as $it) {
            $q = (int) $it['cantidad'];
            $precio = (float) $it['precio_unitario'];
            $total += $q * $precio;
        }

        $email = $valid['email'];

        try {
            $cotizacion = null;
            $ultimoError = null;
            for ($intento = 0; $intento < 8; $intento++) {
                try {
                    $cotizacion = DB::transaction(function () use ($email, $items, $total) {
                        $id = DocumentoNumeracion::reservarSiguienteIdCotizacion();
                        $c = new CotizacionInvitado([
                            'email' => $email,
                            'total' => round($total, 2),
                        ]);
                        $c->id = $id;
                        DocumentoNumeracion::guardarModeloConIdExplicito($c);

                        foreach ($items as $it) {
                            $c->items()->create([
                                'clave' => $it['clave'],
                                'nombre_producto' => $it['nombre_producto'],
                                'cantidad' => (int) $it['cantidad'],
                                'precio_unitario' => (float) $it['precio_unitario'],
                                'imagen' => $it['imagen'] ?? null,
                            ]);
                        }

                        $c->load('items');
                        Mail::to($email)->send(new CotizacionInvitadoMail($c));

                        return $c;
                    });
                    break;
                } catch (QueryException $e) {
                    $ultimoError = $e;
                    if (! DocumentoNumeracion::esViolacionClavePrimariaDuplicada($e)) {
                        throw $e;
                    }
                }
            }

            if (! $cotizacion) {
                throw $ultimoError ?? new \RuntimeException('No se pudo asignar folio de cotización.');
            }
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'success' => false,
                'message' => self::mensajeErrorCorreo($e),
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'Te enviamos la cotización a tu correo electrónico.',
        ], 201);
    }

    /**
     * Gmail (y otros) suelen rechazar la contraseña de acceso web; hace falta contraseña de aplicación.
     */
    private static function mensajeErrorCorreo(\Throwable $e): string
    {
        $m = $e->getMessage();
        $esCredencialGmail = str_contains($m, '535')
            || str_contains($m, 'BadCredentials')
            || str_contains($m, 'not accepted')
            || str_contains($m, 'Authentication failed');

        if ($esCredencialGmail) {
            return 'El servidor de correo rechazó el usuario o la contraseña. En Gmail no uses la contraseña de la cuenta: '
                .'activa la verificación en 2 pasos en tu Google Cuenta y crea una «Contraseña de aplicaciones» '
                .'(Seguridad → Verificación en 2 pasos → Contraseñas de aplicaciones). '
                .'Pon esa clave de 16 caracteres en MAIL_PASSWORD del archivo .env y reinicia el servidor PHP.';
        }

        return 'No se pudo enviar la cotización por correo. Verifica MAIL_* en .env (SMTP) o inténtalo más tarde.';
    }
}
