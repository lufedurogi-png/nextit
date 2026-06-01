<?php

namespace App\Support;

use App\Models\ProductoCva;

class VentasFichaProductoEnricher
{
    /**
     * @param  array<int, array<string, mixed>>  $items
     * @return array<int, array<string, mixed>>
     */
    public static function enrichItems(array $items): array
    {
        if ($items === []) {
            return [];
        }

        $claves = collect($items)
            ->map(fn ($it) => isset($it['clave']) ? trim((string) $it['clave']) : '')
            ->filter()
            ->unique()
            ->values()
            ->all();

        $productos = $claves === []
            ? collect()
            : ProductoCva::query()->whereIn('clave', $claves)->get()->keyBy('clave');

        return array_values(array_map(function (array $item) use ($productos) {
            $clave = isset($item['clave']) ? trim((string) $item['clave']) : '';
            $nombre = $item['nombre_producto'] ?? $item['descripcion'] ?? $clave;
            $out = array_merge($item, [
                'clave' => $clave ?: ($item['clave'] ?? null),
                'nombre_producto' => $nombre,
            ]);

            if ($clave !== '' && $productos->has($clave)) {
                /** @var ProductoCva $p */
                $p = $productos->get($clave);
                $out['imagen'] = $p->imagen;
                $out['imagenes'] = is_array($p->imagenes) ? $p->imagenes : [];
                $out['stock'] = (int) $p->disponible + (int) $p->disponible_cd;
                if (empty($out['nombre_producto'])) {
                    $out['nombre_producto'] = $p->descripcion ?? $clave;
                }
            } else {
                $out['imagen'] = $out['imagen'] ?? null;
                $out['imagenes'] = $out['imagenes'] ?? [];
                $out['stock'] = $out['stock'] ?? null;
            }

            return $out;
        }, $items));
    }
}
