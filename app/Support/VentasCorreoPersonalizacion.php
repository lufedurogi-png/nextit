<?php

namespace App\Support;

class VentasCorreoPersonalizacion
{
    public const ETIQUETA_USUARIOS = '@usuarios';

    public static function nombreParaDestinatario(?string $nombre, string $email): string
    {
        $nombre = trim((string) $nombre);
        if ($nombre !== '') {
            return $nombre;
        }

        $local = strstr($email, '@', true);
        if (is_string($local) && $local !== '') {
            return $local;
        }

        return 'cliente';
    }

    public static function personalizar(string $html, ?string $nombre, string $email): string
    {
        if (! str_contains($html, self::ETIQUETA_USUARIOS)) {
            return $html;
        }

        $reemplazo = htmlspecialchars(
            self::nombreParaDestinatario($nombre, $email),
            ENT_QUOTES,
            'UTF-8',
        );

        return str_replace(self::ETIQUETA_USUARIOS, $reemplazo, $html);
    }
}
