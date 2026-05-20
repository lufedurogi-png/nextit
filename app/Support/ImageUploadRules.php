<?php

namespace App\Support;

/**
 * Límites de subida de imágenes (KB en reglas Laravel "max").
 * El cliente comprime antes de enviar; estos topes son red de seguridad generosa.
 */
final class ImageUploadRules
{
    /** 50 MB por archivo tras compresión en el cliente. */
    public const MAX_FILE_KB = 51200;

    public const MAX_FEED_POST_IMAGES = 20;

    public const MAX_FEED_COMMENT_IMAGES = 12;

    public const MAX_GROUP_POST_IMAGES = 20;

    public const MAX_GROUP_COMMENT_IMAGES = 12;

    /** @return array<string, list<mixed>> */
    public static function uploadFileRule(): array
    {
        return [
            'file' => ['required', 'file', 'max:'.self::MAX_FILE_KB, 'mimes:jpeg,png,jpg,gif,webp'],
        ];
    }

    /** @return array<string, list<mixed>> */
    public static function feedPostFileRules(): array
    {
        return [
            'images' => ['sometimes', 'array', 'max:'.self::MAX_FEED_POST_IMAGES],
            'images.*' => ['file', 'max:'.self::MAX_FILE_KB, 'mimes:jpeg,png,jpg,gif,webp'],
        ];
    }

    /** @return array<string, list<mixed>> */
    public static function feedCommentFileRules(): array
    {
        return [
            'images' => ['sometimes', 'array', 'max:'.self::MAX_FEED_COMMENT_IMAGES],
            'images.*' => ['file', 'max:'.self::MAX_FILE_KB, 'mimes:jpeg,png,jpg,gif,webp'],
        ];
    }

    /** @return array<string, list<mixed>> */
    public static function avatarFileRule(): array
    {
        return ['avatar' => ['file', 'max:'.self::MAX_FILE_KB, 'mimes:jpeg,png,jpg,gif,webp']];
    }

    /** @return array<string, list<mixed>> */
    public static function coverFileRule(): array
    {
        return ['cover' => ['file', 'max:'.self::MAX_FILE_KB, 'mimes:jpeg,png,jpg,gif,webp']];
    }
}
