<?php

namespace App\Mail;

use App\Models\CotizacionInvitado;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CotizacionInvitadoMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public CotizacionInvitado $cotizacion
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Tu cotización — Todo para la oficina',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.cotizacion-invitado',
        );
    }

    /**
     * @return array<int, Attachment>
     */
    public function attachments(): array
    {
        $this->cotizacion->loadMissing('items');
        $pdf = Pdf::loadView('pdf.cotizacion_invitado', ['cotizacion' => $this->cotizacion]);
        $pdf->setPaper('a4', 'portrait');

        return [
            Attachment::fromData(fn () => $pdf->output(), 'cotizacion-'.$this->cotizacion->id.'.pdf')
                ->withMime('application/pdf'),
        ];
    }
}
