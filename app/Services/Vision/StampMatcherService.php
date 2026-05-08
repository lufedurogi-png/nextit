<?php

namespace App\Services\Vision;

use App\Models\FranchiseStamp;
use Illuminate\Support\Collection as IlluminateCollection;

class StampMatcherService
{
    public const MIN_SCORE = 62;

    /** Umbral más bajo cuando el catálogo solo trae datos mínimos (país + nombre [+ nº álbum]) y el resto lo aporta el OCR. */
    public const MIN_SCORE_SPARSE = 60;

    /**
     * Catálogo “delgado”: sin club ni línea de estadísticas ni fecha/altura/peso en BD,
     * típico de referencias cargadas solo desde el álbum (país + índice + nombre).
     *
     * También se fuerza con `meta.sparse_reference === true` en el registro importado.
     */
    public function isSparseCatalogStamp(FranchiseStamp $stamp): bool
    {
        $meta = $stamp->meta;
        if (is_array($meta) && (($meta['sparse_reference'] ?? false) === true)) {
            return true;
        }

        $empty = static fn (?string $v): bool => $v === null || trim($v) === '';

        return $empty($stamp->club)
            && $empty($stamp->stats_line)
            && $empty($stamp->dob)
            && $empty($stamp->height)
            && $empty($stamp->weight);
    }

    /**
     * @param  IlluminateCollection<int, FranchiseStamp>  $stamps
     * @param  array<string, mixed>  $ocr
     * @return array{best: ?FranchiseStamp, score: float, debug: array<string, mixed>}
     */
    public function bestMatch(IlluminateCollection $stamps, array $ocr): array
    {
        $best = null;
        $bestScore = 0.0;
        $debugRows = [];

        foreach ($stamps as $stamp) {
            $row = $this->scoreOne($stamp, $ocr);
            $debugRows[] = $row;
            if ($row['total'] > $bestScore) {
                $bestScore = $row['total'];
                $best = $stamp;
            }
        }

        $min = ($best !== null && $this->isSparseCatalogStamp($best))
            ? self::MIN_SCORE_SPARSE
            : self::MIN_SCORE;
        if ($bestScore < $min) {
            $best = null;
        }

        return [
            'best' => $best,
            'score' => round($bestScore, 1),
            'debug' => ['rows' => $debugRows],
        ];
    }

    /**
     * @return array<string, float|int|string|null|bool>
     */
    private function scoreOne(FranchiseStamp $stamp, array $ocr): array
    {
        if ($this->isSparseCatalogStamp($stamp)) {
            return $this->scoreOneSparse($stamp, $ocr);
        }

        $cO = $this->norm($ocr['country_code'] ?? '');
        $cS = $this->norm($stamp->country_code ?? '');
        $country = ($cO !== '' && $cS !== '' && $cO === $cS) ? 100.0 : (($cO === '' || $cS === '') ? 50.0 : 0.0);

        $pO = $this->norm($ocr['player_name'] ?? '');
        $pS = $this->norm($stamp->player_name ?? '');
        $player = $this->textSimilarity($pO, $pS);

        $clO = $this->norm($ocr['club'] ?? '');
        $clS = $this->norm($stamp->club ?? '');
        $club = $this->textSimilarity($clO, $clS);

        $stO = $this->norm($ocr['stats_line'] ?? '');
        $stS = $this->norm($stamp->stats_line ?? '');
        if ($stS === '') {
            $stS = $this->norm(trim(($stamp->dob ?? '').' | '.($stamp->height ?? '').' | '.($stamp->weight ?? '')));
        }
        $stats = $this->textSimilarity($stO, $stS);

        $wCountry = ($cO !== '' && $cS !== '') ? 0.28 : 0.12;
        $wPlayer = 0.34;
        $wClub = 0.24;
        $wStats = 1 - $wCountry - $wPlayer - $wClub;

        $total = $country * $wCountry + $player * $wPlayer + $club * $wClub + $stats * $wStats;

        return [
            'id' => $stamp->id,
            'total' => round($total, 2),
            'country' => round($country, 1),
            'player' => round($player, 1),
            'club' => round($club, 1),
            'stats' => round($stats, 1),
            'sparse' => false,
        ];
    }

    /**
     * Coincidencia pensada para JSON con solo país + nº (external_code) + nombre: no penaliza club/stats vacíos en BD.
     *
     * @return array<string, float|int|string|null|bool>
     */
    private function scoreOneSparse(FranchiseStamp $stamp, array $ocr): array
    {
        $cO = $this->norm($ocr['country_code'] ?? '');
        $cS = $this->norm($stamp->country_code ?? '');
        if ($cS !== '' && $cO !== '') {
            $country = $cO === $cS ? 100.0 : 0.0;
        } elseif ($cS === '' || $cO === '') {
            $country = 70.0;
        } else {
            $country = 0.0;
        }

        $pO = $this->norm($ocr['player_name'] ?? '');
        $pS = $this->norm($stamp->player_name ?? '');
        $player = $this->textSimilarity($pO, $pS);

        $refNum = $this->digitsOnly($stamp->external_code ?? '');
        $ocrNum = $this->digitsOnly((string) ($ocr['album_number'] ?? ''));
        if ($refNum === '') {
            $num = 100.0;
        } elseif ($ocrNum === '') {
            $num = 68.0;
        } elseif ($refNum === $ocrNum) {
            $num = 100.0;
        } else {
            $num = 28.0;
        }

        $total = $country * 0.34 + $player * 0.50 + $num * 0.16;

        return [
            'id' => $stamp->id,
            'total' => round($total, 2),
            'country' => round($country, 1),
            'player' => round($player, 1),
            'club' => round($num, 1),
            'stats' => 0.0,
            'sparse' => true,
        ];
    }

    private function digitsOnly(?string $s): string
    {
        if ($s === null || $s === '') {
            return '';
        }
        $d = preg_replace('/\D+/u', '', $s) ?? '';

        return $d;
    }

    private function norm(?string $s): string
    {
        if ($s === null) {
            return '';
        }
        $s = mb_strtoupper(trim($s), 'UTF-8');
        $s = str_replace(['Á', 'É', 'Í', 'Ó', 'Ú', 'Ü', 'Ñ'], ['A', 'E', 'I', 'O', 'U', 'U', 'N'], $s);

        return preg_replace('/\s+/u', ' ', $s) ?? $s;
    }

    private function textSimilarity(string $a, string $b): float
    {
        if ($a === '' || $b === '') {
            return 45.0;
        }
        similar_text($a, $b, $pct);

        return min(100.0, (float) $pct);
    }
}
