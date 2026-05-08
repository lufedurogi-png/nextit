<?php

namespace App\Services\Vision;

/**
 * Extrae campos típicos de estampas deportivas (Panini / similar) desde el texto plano del OCR.
 *
 * @return array{
 *   raw_text: string,
 *   country_code: ?string,
 *   album_number: ?string,
 *   player_name: ?string,
 *   stats_line: ?string,
 *   dob: ?string,
 *   height: ?string,
 *   weight: ?string,
 *   club: ?string
 * }
 */
class StampOcrParser
{
    private const IGNORE_TRIPLETS = [
        'FIFA', 'CUP', 'USA', 'PDF', 'PNG', 'JPG', 'THE', 'AND', 'FOR', 'OFF', 'SET', 'TOP', 'NEW', 'OLD', 'RED', 'BLU',
    ];

    public function parse(string $rawText): array
    {
        $text = trim($rawText);
        $flat = preg_replace('/\s+/u', ' ', $text) ?? $text;
        $upper = mb_strtoupper($flat, 'UTF-8');

        $statsLine = null;
        $dob = null;
        $height = null;
        $weight = null;
        if (preg_match('/(\d{1,2}-\d{1,2}-\d{4})\s*[\|\]\/]\s*([\d,\.]+\s*m)\s*[\|\]\/]\s*(\d+\s*kg)/iu', $upper, $m)) {
            $dob = $m[1];
            $height = $m[2];
            $weight = $m[3];
            $statsLine = $m[1].' | '.$m[2].' | '.$m[3];
        }

        $club = null;
        if (preg_match('/\b([A-Z0-9\s\.\'\-]+FC\s*\([A-Z]{3}\))\b/u', $upper, $cm)) {
            $club = trim($cm[1]);
        } elseif (preg_match('/\b([A-Z][A-Z0-9\s\.\'\-]{4,})\s*\(([A-Z]{3})\)\s*$/u', $upper, $cm2)) {
            $club = trim($cm2[1]).' ('.$cm2[2].')';
        }

        $country = $this->guessCountryTriplet($upper);
        $albumNumber = $this->guessAlbumNumber($upper, $country);

        $playerName = $this->guessPlayerName($text, $statsLine, $club);

        return [
            'raw_text' => $text,
            'country_code' => $country,
            'album_number' => $albumNumber,
            'player_name' => $playerName,
            'stats_line' => $statsLine,
            'dob' => $dob,
            'height' => $height,
            'weight' => $weight,
            'club' => $club,
        ];
    }

    /**
     * Número junto al código FIFA del país (p. ej. barra vertical "NZL 22") o índice del álbum (p. ej. "MEX" + "3").
     */
    private function guessAlbumNumber(string $upper, ?string $countryCode): ?string
    {
        if ($countryCode !== null && $countryCode !== '') {
            $cc = preg_quote($countryCode, '/');
            if (preg_match('/\b'.$cc.'\s+(\d{1,3})\b/u', $upper, $m)) {
                return $m[1];
            }
        }
        if (preg_match_all('/\b([A-Z]{3})\s+(\d{1,3})\b/u', $upper, $matches, PREG_SET_ORDER)) {
            foreach ($matches as $m) {
                $code = $m[1];
                if (in_array($code, self::IGNORE_TRIPLETS, true)) {
                    continue;
                }
                if (preg_match('/\b'.preg_quote($code, '/').'\s*\(/u', $upper)) {
                    continue;
                }

                return $m[2];
            }
        }

        $lines = preg_split('/\R+/u', $upper) ?: [];
        foreach ($lines as $line) {
            $t = trim($line);
            if (preg_match('/^\d{1,3}$/u', $t)) {
                return $t;
            }
        }

        return null;
    }

    private function guessCountryTriplet(string $upper): ?string
    {
        if (preg_match_all('/\b([A-Z]{3})\b/u', $upper, $matches)) {
            foreach ($matches[1] as $code) {
                if (in_array($code, self::IGNORE_TRIPLETS, true)) {
                    continue;
                }
                if (preg_match('/\b'.preg_quote($code, '/').'\s*\(/u', $upper)) {
                    continue;
                }

                return $code;
            }
        }

        return null;
    }

    private function guessPlayerName(string $originalText, ?string $statsLine, ?string $club): ?string
    {
        $lines = preg_split('/\R+/u', trim($originalText)) ?: [];
        $candidates = [];
        foreach ($lines as $line) {
            $t = trim($line);
            if ($t === '' || mb_strlen($t, 'UTF-8') < 4) {
                continue;
            }
            if (preg_match('/^[A-Z]{3}$/u', $t)) {
                continue;
            }
            if (preg_match('/^\d{1,3}$/u', $t)) {
                continue;
            }
            if (preg_match('/^\d{1,2}-\d{1,2}-\d{4}/u', $t)) {
                continue;
            }
            if ($statsLine && str_contains(mb_strtoupper($t, 'UTF-8'), mb_strtoupper($statsLine, 'UTF-8'))) {
                continue;
            }
            if ($club && str_contains(mb_strtoupper($t, 'UTF-8'), mb_strtoupper($club, 'UTF-8'))) {
                continue;
            }
            if (preg_match('/^[A-Z0-9\s\.\'\-]{4,}$/u', $t) && preg_match('/[A-Z]{2,}/u', $t)) {
                $candidates[] = $t;
            }
        }
        if ($candidates === []) {
            return null;
        }
        if (count($candidates) >= 2) {
            $a = $candidates[0];
            $b = $candidates[1];
            if (mb_strlen($a, 'UTF-8') <= 14 && mb_strlen($b, 'UTF-8') <= 24) {
                return trim($a.' '.$b);
            }
        }
        usort($candidates, fn ($x, $y) => mb_strlen($y, 'UTF-8') <=> mb_strlen($x, 'UTF-8'));

        return $candidates[0];
    }
}
