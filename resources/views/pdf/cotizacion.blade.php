<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Cotización #{{ $cotizacion->id }} – Todo para la oficina</title>
    <style>
        @page { margin: 0; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'DejaVu Sans', sans-serif; font-size: 11px; color: #1f2937; line-height: 1.4; }
        .page-bg-image { position: fixed; top: 0; left: 0; width: 210mm; height: 297mm; z-index: -1; }
        .page { padding: 150px 36px 110px; max-width: 100%; }
        .header { display: table; width: 100%; margin-bottom: 18px; padding-bottom: 10px; border-bottom: 2px solid #0f9d7a; }
        .header-left { display: table-cell; width: 50%; vertical-align: top; }
        .header-right { display: table-cell; width: 50%; text-align: right; vertical-align: top; }
        .doc-label { font-size: 10px; font-weight: 700; color: #0f9d7a; text-transform: uppercase; letter-spacing: 0.1em; }
        .doc-id { font-size: 18px; font-weight: 700; color: #0f9d7a; margin-top: 4px; }
        .doc-meta { font-size: 10px; color: #374151; margin-top: 4px; }
        .section { margin-bottom: 16px; }
        .section-title { font-size: 10px; font-weight: 700; color: #0f9d7a; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; padding-left: 8px; border-left: 3px solid #0f9d7a; }
        table.items { width: 100%; border-collapse: collapse; margin-top: 8px; }
        table.items th { text-align: left; padding: 10px 12px; background: #ecfdf5; font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em; color: #047857; font-weight: 700; border-bottom: 2px solid #0f9d7a; }
        table.items th.qty, table.items th.unit, table.items th.sub { text-align: right; }
        table.items td { padding: 10px 12px; border-bottom: 1px solid #d1fae5; color: #374151; }
        table.items td.qty, table.items td.unit, table.items td.sub { text-align: right; }
        table.items tr:last-child td { border-bottom: 2px solid #d1fae5; }
        .totals { margin-top: 18px; margin-left: auto; width: 260px; }
        .totals tr td { padding: 6px 0; font-size: 11px; }
        .totals tr td:first-child { color: #6b7280; }
        .totals tr td:last-child { text-align: right; font-weight: 600; color: #111827; }
        .totals .total-row td { font-size: 14px; font-weight: 700; color: #047857; padding-top: 10px; border-top: 2px solid #0f9d7a; }
        .footer { margin-top: 18px; padding-top: 12px; border-top: 2px solid #0f9d7a; font-size: 9px; color: #6b7280; text-align: center; }
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
                <div class="doc-label">Cotización</div>
                <div class="doc-id"># {{ $cotizacion->id }}</div>
            </div>
            <div class="header-right">
                <div class="doc-meta">
                    Fecha: {{ $cotizacion->created_at ? $cotizacion->created_at->format('d/m/Y H:i') : now()->format('d/m/Y H:i') }}<br>
                    Cliente: {{ $cotizacion->user?->name ?? 'No registrado' }}
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Detalle de la cotización</div>
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
                    @foreach($cotizacion->items as $item)
                    <tr>
                        <td>{{ $item->nombre_producto }}@if($item->clave) ({{ $item->clave }})@endif</td>
                        <td class="qty">{{ $item->cantidad }}</td>
                        <td class="unit">$ {{ number_format($item->precio_unitario, 2, '.', ',') }}</td>
                        <td class="sub">$ {{ number_format($item->cantidad * $item->precio_unitario, 2, '.', ',') }}</td>
                    </tr>
                    @endforeach
                </tbody>
            </table>

            <table class="totals">
                <tr class="total-row">
                    <td>Total</td>
                    <td>$ {{ number_format($cotizacion->total, 2, '.', ',') }}</td>
                </tr>
            </table>
        </div>

        <div class="footer">
            Cotización {{ $cotizacion->id }} · Documento generado por Todo para la oficina · {{ now()->format('d/m/Y H:i') }}
        </div>
    </div>
</body>
</html>
