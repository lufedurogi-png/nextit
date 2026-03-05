<?php

namespace App\Contratos;

/**
 * Contrato que todo servicio de sincronización de proveedor debe implementar.
 *
 * Cada proveedor (CVA, Exel, Syscom, etc.) tendrá su propio servicio
 * que implemente esta interfaz, encapsulando la comunicación con la API
 * del proveedor y la persistencia en base de datos.
 *
 * Para agregar un nuevo proveedor: crear un servicio que implemente esta
 * interfaz y registrarlo donde se orqueste la sincronización.
 */
interface ProveedorSyncInterface
{
    /**
     * Identificador único del proveedor (ej: 'cva', 'exel', 'syscom').
     */
    public function getProveedorClave(): string;

    /**
     * Indica si el proveedor está configurado (credenciales, etc.).
     */
    public function isConfigured(): bool;

    /**
     * Sincroniza una página del catálogo.
     *
     * @param  int  $page  Número de página (base 1)
     * @return array{synced?: int, paginacion?: array, error?: string}
     */
    public function syncPage(int $page = 1): array;

    /**
     * Sincroniza todo el catálogo (todas las páginas).
     *
     * @return array{synced?: int, pages?: int, error?: string}
     */
    public function syncFullCatalog(): array;
}
