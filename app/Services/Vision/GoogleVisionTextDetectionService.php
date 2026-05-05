<?php

namespace App\Services\Vision;

use Google\Auth\Credentials\ServiceAccountCredentials;
use Google\Cloud\Vision\V1\AnnotateImageRequest;
use Google\Cloud\Vision\V1\BatchAnnotateImagesRequest;
use Google\Cloud\Vision\V1\Client\ImageAnnotatorClient;
use Google\Cloud\Vision\V1\Feature;
use Google\Cloud\Vision\V1\Feature\Type;
use Google\Cloud\Vision\V1\Image;
use RuntimeException;

class GoogleVisionTextDetectionService
{
    public function detectDocumentText(string $imageBinary): string
    {
        $path = config('services.google_vision.credentials');
        if (! is_string($path) || $path === '' || ! is_file($path)) {
            throw new RuntimeException('Configura GOOGLE_VISION_CREDENTIALS_PATH con la ruta absoluta al JSON de la cuenta de servicio.');
        }

        $scopes = ['https://www.googleapis.com/auth/cloud-vision'];
        $credentials = new ServiceAccountCredentials($scopes, $path);

        $client = new ImageAnnotatorClient([
            'credentials' => $credentials,
            'transport' => 'rest',
        ]);

        try {
            $image = (new Image)->setContent($imageBinary);
            $feature = (new Feature)->setType(Type::DOCUMENT_TEXT_DETECTION);
            $request = (new AnnotateImageRequest)
                ->setImage($image)
                ->setFeatures([$feature]);
            $batch = (new BatchAnnotateImagesRequest)->setRequests([$request]);
            $response = $client->batchAnnotateImages($batch);
            $responses = $response->getResponses();
            if ($responses->count() === 0) {
                return '';
            }
            $first = $responses[0];
            if ($first->hasError()) {
                $err = $first->getError();

                throw new RuntimeException($err->getMessage() ?: 'Error de Vision API');
            }
            $annotation = $first->getFullTextAnnotation();

            return $annotation?->getText() ?? '';
        } finally {
            $client->close();
        }
    }
}
