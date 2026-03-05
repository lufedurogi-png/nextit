<?php

namespace App\Services\Providers\Cva;

use App\Contratos\ProveedorSyncInterface;
use App\Services\CVAService;

/**
 * Servicio de sincronización para el proveedor CVA.
 *
 * Implementa ProveedorSyncInterface delegando en CVAService.
 * Permite integrar CVA en una arquitectura multi-proveedor.
 */
class CvaSyncService implements ProveedorSyncInterface
{
    public function __construct(
        private readonly CVAService $cva
    ) {}

    public function getProveedorClave(): string
    {
        return 'cva';
    }

    public function isConfigured(): bool
    {
        return $this->cva->isConfigured();
    }

    public function syncPage(int $page = 1): array
    {
        return $this->cva->syncPage($page);
    }

    public function syncFullCatalog(): array
    {
        return $this->cva->syncFullCatalog();
    }
}
