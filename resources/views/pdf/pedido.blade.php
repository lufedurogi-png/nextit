<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Pedido {{ $pedido->folio }} – Todo para la oficina</title>
    <style>
        @page { margin: 0; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'DejaVu Sans', sans-serif; font-size: 11px; color: #1f2937; line-height: 1.4; }
        .page-bg-image { position: fixed; top: 0; left: 0; width: 210mm; height: 297mm; z-index: -1; }
        .page { padding: 150px 36px 110px; max-width: 100%; }
        .header { display: table; width: 100%; margin-bottom: 18px; padding-bottom: 10px; border-bottom: 2px solid #ea580c; }
        .header-left { display: table-cell; width: 50%; vertical-align: top; }
        .header-right { display: table-cell; width: 50%; text-align: right; vertical-align: top; }
        .doc-label { font-size: 10px; font-weight: 700; color: #ea580c; text-transform: uppercase; letter-spacing: 0.1em; }
        .doc-folio { font-size: 20px; font-weight: 700; color: #ea580c; margin-top: 4px; }
        .doc-meta { font-size: 10px; color: #374151; margin-top: 4px; }
        .section { margin-bottom: 16px; }
        .section-title { font-size: 10px; font-weight: 700; color: #ea580c; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; padding-left: 8px; border-left: 3px solid #ea580c; }
        table.info-modern { width: 100%; border-collapse: separate; border-spacing: 0; border-radius: 10px; overflow: hidden; border: 1px solid #fed7aa; margin-top: 6px; }
        table.info-modern th { background: linear-gradient(90deg, #fff7ed 0%, #ffedd5 100%); color: #9a3412; font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; padding: 10px 12px; text-align: left; border-bottom: 2px solid #ea580c; }
        table.info-modern td { padding: 10px 12px; vertical-align: top; border-bottom: 1px solid #ffedd5; font-size: 10px; color: #374151; }
        table.info-modern td.k { width: 28%; font-weight: 700; color: #c2410c; background: #fffbeb; }
        table.info-modern tr:last-child td { border-bottom: none; }
        /* Tres columnas: encabezados arriba, datos en una sola fila (menos alto que filas apiladas) */
        table.info-modern.info-flow { table-layout: fixed; }
        table.info-modern.info-flow th { padding: 6px 6px; font-size: 8px; text-align: center; vertical-align: middle; border-right: 1px solid #fdba74; border-bottom: 2px solid #ea580c; }
        table.info-modern.info-flow th:last-child { border-right: none; }
        table.info-modern.info-flow td { padding: 6px 7px; font-size: 9px; line-height: 1.35; border-bottom: none; border-right: 1px solid #ffedd5; background: #fff; }
        table.info-modern.info-flow td:last-child { border-right: none; }
        table.items { width: 100%; border-collapse: collapse; margin-top: 8px; }
        table.items th { text-align: left; padding: 10px 12px; background: #fff7ed; font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em; color: #c2410c; font-weight: 700; border-bottom: 2px solid #ea580c; }
        table.items th.qty, table.items th.unit, table.items th.sub { text-align: right; }
        table.items td { padding: 10px 12px; border-bottom: 1px solid #ffedd5; color: #374151; }
        table.items td.qty, table.items td.unit, table.items td.sub { text-align: right; }
        table.items tr:last-child td { border-bottom: 2px solid #ffedd5; }
        .totals { margin-top: 18px; margin-left: auto; width: 280px; }
        .totals tr td { padding: 6px 0; font-size: 11px; }
        .totals tr td:first-child { color: #6b7280; }
        .totals tr td:last-child { text-align: right; font-weight: 600; color: #111827; font-size: 10px; }
        .totals .total-row td { font-size: 14px; font-weight: 700; color: #ea580c; padding-top: 8px; border-top: 2px solid #ea580c; vertical-align: top; }
        .leyenda-num { font-size: 8.5px; color: #4b5563; margin-top: 2px; font-style: italic; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 9px; font-weight: 700; text-transform: uppercase; }
        .badge-pago { background: #fef3c7; color: #92400e; }
        .badge-pagado { background: #d1fae5; color: #065f46; }
        .badge-estado { background: #ffedd5; color: #c2410c; }
        .footer { margin-top: 18px; padding-top: 12px; border-top: 2px solid #ea580c; font-size: 9px; color: #9ca3af; text-align: center; }
        .footer strong { color: #ea580c; }
    </style>
</head>
@php
    use App\Support\NumeroLetraMx;

    $bgCandidates = [
        'Imagenes/Hoja_membretada.png',
        'Imagenes/Hoja_membretada.jpg',
        'Imagenes/Hoja_membretada.jpeg',
    ];
    $bgData = null;
    foreach ($bgCandidates as $candidate) {
        $path = public_path($candidate);
        if (! file_exists($path)) {
            continue;
        }
        $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        $mime = $ext === 'png' ? 'image/png' : 'image/jpeg';
        $bgData = 'data:'.$mime.';base64,'.base64_encode(file_get_contents($path));
        break;
    }

    $dirNombre = $pedido->direccionEnvio?->nombre;
    $dirLinea = $pedido->direccionEnvio
        ? trim(implode(' ', array_filter([
            $pedido->direccionEnvio->calle,
            $pedido->direccionEnvio->numero_exterior,
            $pedido->direccionEnvio->numero_interior ? 'int. '.$pedido->direccionEnvio->numero_interior : null,
        ])))
        : '';
    $dirCiudad = $pedido->direccionEnvio
        ? trim($pedido->direccionEnvio->colonia.', '.$pedido->direccionEnvio->ciudad.', '.$pedido->direccionEnvio->estado.' · CP '.$pedido->direccionEnvio->codigo_postal)
        : '';
    $dirExtra = $pedido->direccionEnvio
        ? trim(implode("\n", array_filter([
            $pedido->direccionEnvio->telefono ? 'Tel. '.$pedido->direccionEnvio->telefono : null,
            $pedido->direccionEnvio->referencias ? 'Ref. '.$pedido->direccionEnvio->referencias : null,
        ])))
        : '';

    $fiscalNombre = $pedido->datosFacturacion?->razon_social;
    $fiscalBody = $pedido->datosFacturacion
        ? trim(implode("\n", array_filter([
            'RFC '.$pedido->datosFacturacion->rfc,
            trim(implode(' ', array_filter([
                $pedido->datosFacturacion->calle,
                $pedido->datosFacturacion->numero_exterior,
                $pedido->datosFacturacion->numero_interior ? 'int. '.$pedido->datosFacturacion->numero_interior : null,
            ]))),
            trim($pedido->datosFacturacion->colonia.', '.$pedido->datosFacturacion->ciudad.', '.$pedido->datosFacturacion->estado.' · CP '.$pedido->datosFacturacion->codigo_postal),
        ])))
        : '';

    $sumaItems = (float) $pedido->items->sum(fn ($i) => (float) $i->subtotal);
    $envioPedido = $pedido->envio;
    $costoEnvioPdf = $envioPedido ? (float) $envioPedido->costo_envio : null;
    $detEnv = $envioPedido && is_array($envioPedido->detalle_cotizacion) ? $envioPedido->detalle_cotizacion : [];
    $envioOmitidoApi = ! empty($detEnv['omitido']);
@endphp
<body>
    @if($bgData)
        <img class="page-bg-image" src="{{ $bgData }}" alt="Membrete">
    @endif
    <div class="page">
        <div class="header">
            <div class="header-left">
                <div class="doc-label">Comprobante de pedido</div>
                <div class="doc-folio"># {{ $pedido->folio }}</div>
            </div>
            <div class="header-right">
                <div class="doc-meta">
                    Fecha: {{ $pedido->fecha->format('d/m/Y') }}<br>
                    Método de pago: {{ $pedido->metodo_pago }}<br>
                    @if($pedido->estado_pago === 'pagado')
                        <span class="badge badge-pagado">Pagado</span>
                    @else
                        <span class="badge badge-pago">Pendiente de pago</span>
                    @endif
                    &nbsp; · &nbsp;
                    <span class="badge badge-estado">{{ $pedido->estatus_pedido }}</span>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Cliente, envío y datos fiscales</div>
            <table class="info-modern info-flow">
                <thead>
                    <tr>
                        <th>Cliente</th>
                        <th>Dirección de envío</th>
                        <th>Datos fiscales</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            <strong>{{ $pedido->user->name }}</strong><br>
                            {{ $pedido->user->email }}
                        </td>
                        <td>
                            @if($pedido->direccionEnvio)
                                @if($dirNombre)<strong>{{ $dirNombre }}</strong><br>@endif
                                @if($dirLinea){{ $dirLinea }}<br>@endif
                                @if($dirCiudad){{ $dirCiudad }}@endif
                                @if($dirExtra !== '')<br><span style="white-space: pre-line;">{{ $dirExtra }}</span>@endif
                            @else
                                <span style="color:#9ca3af;">—</span>
                            @endif
                        </td>
                        <td>
                            @if($pedido->datosFacturacion)
                                @if($fiscalNombre)<strong>{{ $fiscalNombre }}</strong><br>@endif
                                <span style="white-space: pre-line;">{{ $fiscalBody }}</span>
                            @else
                                <span style="color:#9ca3af;">—</span>
                            @endif
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="section">
            <div class="section-title">Detalle del pedido</div>
            <table class="items">
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th class="qty">Cant.</th>
                        <th class="unit">P. unit.</th>
                        <th class="sub">Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($pedido->items as $item)
                    <tr>
                        <td>{{ $item->nombre_producto }}</td>
                        <td class="qty">{{ number_format((float) $item->cantidad, 0, '.', ',') }}</td>
                        <td class="unit">$ {{ number_format((float) $item->precio_unitario, 2, '.', ',') }}</td>
                        <td class="sub">$ {{ number_format((float) $item->subtotal, 2, '.', ',') }}</td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
            <table class="totals">
                <tr>
                    <td>Subtotal productos</td>
                    <td>$ {{ number_format($sumaItems, 2, '.', ',') }}</td>
                </tr>
                @if($envioPedido)
                    <tr>
                        <td>Envío @if($envioOmitidoApi)<span style="font-size:8px;color:#6b7280;">(sin API CVA)</span>@endif</td>
                        <td>$ {{ number_format((float) $costoEnvioPdf, 2, '.', ',') }}</td>
                    </tr>
                    @if($envioPedido->fecha_entrega_desde && $envioPedido->fecha_entrega_hasta)
                        <tr>
                            <td colspan="2" style="font-size:8.5px;color:#6b7280;padding-top:4px;">
                                Entrega estimada entre {{ $envioPedido->fecha_entrega_desde->format('d/m/Y') }} y {{ $envioPedido->fecha_entrega_hasta->format('d/m/Y') }}
                            </td>
                        </tr>
                    @endif
                @else
                    <tr>
                        <td>Envío</td>
                        <td style="color:#9ca3af;font-size:9px;">— (no registrado en este pedido)</td>
                    </tr>
                @endif
                <tr class="total-row">
                    <td>Total</td>
                    <td>
                        $ {{ number_format($pedido->monto, 2, '.', ',') }}
                        <div class="leyenda-num">({{ NumeroLetraMx::monto((float) $pedido->monto) }})</div>
                    </td>
                </tr>
            </table>
        </div>

        <div class="footer">
            <strong>Pedido {{ $pedido->folio }}</strong> · Documento generado por Todo para la oficina · {{ now()->format('d/m/Y H:i') }}
        </div>
    </div>
</body>
</html>
