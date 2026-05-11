<?php

/**
 * Estimaciones de comisión pasarelas (referencia para informes administrativos).
 * Ajustar según contrato/región vigente — no sustituye extractos oficiales.
 *
 * PayPal típico (web): porcentaje + fijo en USD.
 * Mercado Pago México: aproximación porcentaje sobre cobro con tarjeta / checkout estándar (varía).
 */
return [
    /** Cuántos MXN equivalen a 1 USD (solo para conversiones del informe). */
    'mxn_per_usd' => (float) env('PLAN_REVENUE_MXN_PER_USD', 20.5),

    'paypal_percent' => (float) env('PLAN_REVENUE_PAYPAL_PERCENT', 3.59),
    'paypal_fixed_usd' => (float) env('PLAN_REVENUE_PAYPAL_FIXED_USD', 0.49),

    'mercadopago_percent_mxn' => (float) env('PLAN_REVENUE_MP_PERCENT_MXN', 4.89),
];
