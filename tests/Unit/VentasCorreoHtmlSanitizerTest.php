<?php

namespace Tests\Unit;

use App\Support\VentasCorreoHtmlSanitizer;
use PHPUnit\Framework\TestCase;

class VentasCorreoHtmlSanitizerTest extends TestCase
{
    public function test_preserva_fuente_arial_y_resaltado_rgb(): void
    {
        $html = '<span style="font-family: Arial; font-size: 16px; background-color: rgb(254, 240, 138);">Hola</span>';
        $clean = VentasCorreoHtmlSanitizer::sanitize($html);

        $this->assertStringContainsString('font-family: Arial, Helvetica, sans-serif', $clean);
        $this->assertStringContainsString('background-color: #fef08a', $clean);
        $this->assertStringContainsString('font-size: 16px', $clean);
    }

    public function test_preserva_times_new_roman_con_comillas(): void
    {
        $html = '<span style="font-family: &quot;Times New Roman&quot;, Times, serif;">Texto</span>';
        $clean = VentasCorreoHtmlSanitizer::sanitize($html);

        $this->assertStringContainsString('font-family: Times New Roman, Times, serif', $clean);
    }
}
