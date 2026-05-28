<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
</head>
<body style="font-family: sans-serif; line-height: 1.6; color: #1f2937; max-width: 640px;">
    @if($remitenteNombre)
        <p style="margin-bottom: 16px; color: #6b7280; font-size: 13px;">Mensaje de <strong>{{ $remitenteNombre }}</strong> — Todo para la oficina</p>
    @endif
    <div style="font-size: 15px;">{!! $cuerpoHtml !!}</div>
    <p style="margin-top: 28px; color: #6b7280; font-size: 12px;">
        <strong>Tienda en línea</strong><br />
        <a href="https://todoparaoficna.shop/tienda" style="color: #7c3aed; font-weight: 600;">https://todoparaoficna.shop/tienda</a>
    </p>
</body>
</html>
