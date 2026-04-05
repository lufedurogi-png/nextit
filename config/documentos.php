<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Número inicial de documentos (cotizaciones, folio de pedidos)
    |--------------------------------------------------------------------------
    |
    | Los pedidos usan un folio numérico de 6 dígitos. Las cotizaciones (registradas
    | e invitadas) usan el id como folio visible: siempre ≥ este valor y estrictamente
    | mayor al máximo id ya guardado en ambas tablas (DocumentoNumeracion).
    |
    */
    'numero_inicial' => (int) env('DOCUMENTO_NUMERO_INICIAL', 1000),

];
