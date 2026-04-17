<?php

return [
    /*
    | Rango de entrega estimada (días naturales desde la fecha del pedido).
    | Se muestra al cliente como: estimado en X, posible entre A y B.
    */
    'dias_entrega_min' => (int) env('ENVIO_DIAS_ENTREGA_MIN', 3),
    'dias_entrega_max' => (int) env('ENVIO_DIAS_ENTREGA_MAX', 7),

    /** Paquetía CVA (mismo id que en integración de referencia). */
    'cva_paqueteria_id' => (int) env('CVA_PAQUETERIA_ID', 4),

    /** CP de origen fijos (Guadalajara) para cotización vía CVA. */
    'cva_cp_cedis_gdl' => (int) env('CVA_CP_CEDIS_GDL', 45640),
    'cva_cp_sucursal_gdl' => (int) env('CVA_CP_SUCURSAL_GDL', 44900),
];
