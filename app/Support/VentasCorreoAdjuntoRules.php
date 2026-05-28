<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Validation\Validator;

class VentasCorreoAdjuntoRules
{
  /** @var list<string> */
    public const EXTENSIONES_PERMITIDAS = [
        'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt',
        'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'tif', 'tiff', 'heic', 'heif', 'ico',
    ];

    /** Sin tope en validación Laravel; el límite real lo marca php.ini (upload_max_filesize). */
    public const MAX_IMAGENES_INLINE = 50;

    public static function extensionPermitida(?string $extension): bool
    {
        if ($extension === null || $extension === '') {
            return false;
        }

        return in_array(mb_strtolower($extension), self::EXTENSIONES_PERMITIDAS, true);
    }

    public static function validarArchivo(UploadedFile $file, Validator $validator, string $atributo): void
    {
        $ext = mb_strtolower($file->getClientOriginalExtension() ?: '');
        if (! self::extensionPermitida($ext)) {
            $validator->errors()->add(
                $atributo,
                'Tipo no permitido. Usa Word, Excel, PowerPoint, TXT o imágenes (JPG, PNG, GIF, WEBP, etc.).'
            );
        }
    }

    public static function validarImagenInline(UploadedFile $file, Validator $validator, string $atributo): void
    {
        $ext = mb_strtolower($file->getClientOriginalExtension() ?: '');
        $mime = (string) $file->getMimeType();
        $esImagen = str_starts_with($mime, 'image/') || in_array($ext, [
            'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'tif', 'tiff', 'heic', 'heif', 'ico',
        ], true);

        if (! $esImagen) {
            $validator->errors()->add($atributo, 'Solo se permiten archivos de imagen en esta sección.');
        }
    }

    /**
     * @return list<string>
     */
    public static function etiquetaTiposPermitidos(): array
    {
        return [
            'Word (.doc, .docx)',
            'Excel (.xls, .xlsx)',
            'PowerPoint (.ppt, .pptx)',
            'Texto (.txt)',
            'Imágenes (JPG, PNG, GIF, WEBP, SVG, etc.)',
        ];
    }
}
