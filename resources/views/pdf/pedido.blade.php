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
        .address-block { font-size: 10px; color: #374151; }
        .address-block strong { color: #111827; }
        table.items { width: 100%; border-collapse: collapse; margin-top: 8px; }
        table.items th { text-align: left; padding: 10px 12px; background: #fff7ed; font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em; color: #c2410c; font-weight: 700; border-bottom: 2px solid #ea580c; }
        table.items th.qty, table.items th.unit, table.items th.sub { text-align: right; }
        table.items td { padding: 10px 12px; border-bottom: 1px solid #ffedd5; color: #374151; }
        table.items td.qty, table.items td.unit, table.items td.sub { text-align: right; }
        table.items tr:last-child td { border-bottom: 2px solid #ffedd5; }
        .totals { margin-top: 18px; margin-left: auto; width: 240px; }
        .totals tr td { padding: 6px 0; font-size: 11px; }
        .totals tr td:first-child { color: #6b7280; }
        .totals tr td:last-child { text-align: right; font-weight: 600; color: #111827; }
        .totals .total-row td { font-size: 14px; font-weight: 700; color: #ea580c; padding-top: 10px; border-top: 2px solid #ea580c; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 9px; font-weight: 700; text-transform: uppercase; }
        .badge-pago { background: #fef3c7; color: #92400e; }
        .badge-pagado { background: #d1fae5; color: #065f46; }
        .badge-estado { background: #ffedd5; color: #c2410c; }
        .footer { margin-top: 18px; padding-top: 12px; border-top: 2px solid #ea580c; font-size: 9px; color: #9ca3af; text-align: center; }
        .footer strong { color: #ea580c; }
    </style>
</head>
@php
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
        $bgData = 'data:' . $mime . ';base64,' . base64_encode(file_get_contents($path));
        break;
    }
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
            <div class="section-title">Cliente</div>
            <div class="address-block">
                <strong>{{ $pedido->user->name }}</strong><br>
                {{ $pedido->user->email }}
            </div>
        </div>

        @if($pedido->direccionEnvio)
        <div class="section">
            <div class="section-title">Dirección de envío</div>
            <div class="address-block">
                {{ $pedido->direccionEnvio->nombre }}<br>
                {{ $pedido->direccionEnvio->calle }}
                @if($pedido->direccionEnvio->numero_exterior) {{ $pedido->direccionEnvio->numero_exterior }}@endif
                @if($pedido->direccionEnvio->numero_interior) int. {{ $pedido->direccionEnvio->numero_interior }}@endif<br>
                {{ $pedido->direccionEnvio->colonia }}, {{ $pedido->direccionEnvio->ciudad }}, {{ $pedido->direccionEnvio->estado }}<br>
                CP {{ $pedido->direccionEnvio->codigo_postal }}
                @if($pedido->direccionEnvio->telefono)<br>Tel. {{ $pedido->direccionEnvio->telefono }}@endif
                @if($pedido->direccionEnvio->referencias)<br>Ref: {{ $pedido->direccionEnvio->referencias }}@endif
            </div>
        </div>
        @endif

        @if($pedido->datosFacturacion)
        <div class="section">
            <div class="section-title">Datos fiscales (facturación)</div>
            <div class="address-block">
                <strong>{{ $pedido->datosFacturacion->razon_social }}</strong><br>
                RFC {{ $pedido->datosFacturacion->rfc }}<br>
                {{ $pedido->datosFacturacion->calle }}
                @if($pedido->datosFacturacion->numero_exterior) {{ $pedido->datosFacturacion->numero_exterior }}@endif
                @if($pedido->datosFacturacion->numero_interior) int. {{ $pedido->datosFacturacion->numero_interior }}@endif<br>
                {{ $pedido->datosFacturacion->colonia }}, {{ $pedido->datosFacturacion->ciudad }}, {{ $pedido->datosFacturacion->estado }}<br>
                CP {{ $pedido->datosFacturacion->codigo_postal }}
            </div>
        </div>
        @endif

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
                        <td class="qty">{{ $item->cantidad }}</td>
                        <td class="unit">$ {{ number_format($item->precio_unitario, 2, '.', ',') }}</td>
                        <td class="sub">$ {{ number_format($item->subtotal, 2, '.', ',') }}</td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
            <table class="totals">
                <tr class="total-row">
                    <td>Total</td>
                    <td>$ {{ number_format($pedido->monto, 2, '.', ',') }}</td>
                </tr>
            </table>
        </div>

        <div class="footer">
            <strong>Pedido {{ $pedido->folio }}</strong> · Documento generado por Todo para la oficina · {{ now()->format('d/m/Y H:i') }}
        </div>
    </div>
</body>
</html>
