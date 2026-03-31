<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Número inicial de documentos (cotizaciones, folio de pedidos)
    |--------------------------------------------------------------------------
    |
    | Los pedidos usan un folio numérico de 6 dígitos. Las cotizaciones usan
    | el id autonumérico en PDFs del servidor. Ambos empiezan como mínimo en
    | este valor (p. ej. 1000 → folio 001000, cotización #1000).
    |
    */
    'numero_inicial' => (int) env('DOCUMENTO_NUMERO_INICIAL', 1000),

];
