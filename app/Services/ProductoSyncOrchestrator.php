<?php

namespace App\Services;

use App\Contratos\ProveedorSyncInterface;
use Illuminate\Support\Facades\Log;

/**
 * Orquestador de sincronización de productos de múltiples proveedores.
 *
 * Permite ejecutar sync de todos los proveedores registrados.
 * Para agregar un proveedor: crear un servicio que implemente
 * ProveedorSyncInterface e inyectarlo en el constructor.
 */
class ProductoSyncOrchestrator
{
    /**
     * @param  array<ProveedorSyncInterface>  $proveedores
     */
    public function __construct(
        private readonly array $proveedores
    ) {}

    /**
     * Sincroniza el catálogo completo de todos los proveedores configurados.
     *
     * @return array<string, array{synced?: int, pages?: int, error?: string}>
     */
    public function syncTodosLosProveedores(): array
    {
        $resultados = [];

        foreach ($this->proveedores as $proveedor) {
            $clave = $proveedor->getProveedorClave();

            if (! $proveedor->isConfigured()) {
                Log::info("ProductoSyncOrchestrator: {$clave} no configurado, omitiendo");
                $resultados[$clave] = ['error' => 'no_configurado'];

                continue;
            }

            $resultados[$clave] = $proveedor->syncFullCatalog();
        }

        return $resultados;
    }

    /**
     * Sincroniza solo un proveedor por su clave.
     */
    public function syncProveedor(string $clave): ?array
    {
        foreach ($this->proveedores as $proveedor) {
            if ($proveedor->getProveedorClave() === $clave) {
                if (! $proveedor->isConfigured()) {
                    return ['error' => 'no_configurado'];
                }

                return $proveedor->syncFullCatalog();
            }
        }

        return null;
    }
}
