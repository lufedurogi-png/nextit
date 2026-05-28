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
     * @param  list<array{path: string, mime?: string}>  $adjuntosArchivos
     * @param  list<array{path: string, mime?: string}>  $imagenesInline
     */
    public function __construct(
        public string $asunto,
        protected string $cuerpoHtml,
        protected ?string $remitenteNombre = null,
        protected array $adjuntosArchivos = [],
        protected array $imagenesInline = [],
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
                'cuerpoHtml' => $this->cuerpoHtml,
                'imagenesInline' => $this->imagenesInline,
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
}
