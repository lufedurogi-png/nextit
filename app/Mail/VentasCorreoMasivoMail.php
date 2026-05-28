<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class VentasCorreoMasivoMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param  list<array{path: string, name: string}>  $adjuntosArchivos
     * @param  list<array{path: string, mime?: string}>  $imagenesInline
     */
    public function __construct(
        public string $asunto,
        public string $cuerpoHtml,
        public ?string $remitenteNombre = null,
        public array $adjuntosArchivos = [],
        public array $imagenesInline = [],
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->asunto,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.ventas-correo',
            with: [
                'cuerpoHtml' => $this->resolverCuerpoConImagenes(),
                'remitenteNombre' => $this->remitenteNombre,
            ],
        );
    }

    /**
     * @return array<int, Attachment>
     */
    public function attachments(): array
    {
        $out = [];
        foreach ($this->adjuntosArchivos as $adj) {
            $path = $adj['path'] ?? '';
            $name = $adj['name'] ?? basename($path);
            if ($path !== '' && is_readable($path)) {
                $out[] = Attachment::fromPath($path)->as($name);
            }
        }

        return $out;
    }

    private function resolverCuerpoConImagenes(): string
    {
        $html = $this->cuerpoHtml;

        foreach ($this->imagenesInline as $i => $img) {
            $path = $img['path'] ?? '';
            if ($path === '' || ! is_readable($path)) {
                continue;
            }
            $mime = $img['mime'] ?? (mime_content_type($path) ?: 'image/jpeg');
            $contenido = file_get_contents($path);
            if ($contenido === false) {
                continue;
            }
            $src = 'data:'.$mime.';base64,'.base64_encode($contenido);
            $etiqueta = '<img src="'.$src.'" alt="" style="max-width:100%;height:auto;display:block;margin:12px 0;border-radius:6px;" />';
            $html = str_replace('[[IMG:'.$i.']]', $etiqueta, $html);
        }

        return $html;
    }
}
