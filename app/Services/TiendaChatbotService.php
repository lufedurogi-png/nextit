<?php

namespace App\Services;

use Illuminate\Support\Str;

/**
 * Chatbot de tienda: plantillas claras + búsqueda por títulos del catálogo
 * (con expansión/stemming) + conversación/seguimiento + IA de apoyo.
 */
class TiendaChatbotService
{
    public function __construct(
        private readonly BusquedaService $busqueda,
        private readonly IaApiService $iaApi,
    ) {}

    /**
     * @return array{reply: string, links: array<int, array{label: string, href: string}>, products: array<int, array<string, mixed>>, intent: string}
     */
    public function handle(string $message, ?string $sessionId = null, ?int $userId = null, ?string $context = null): array
    {
        $raw = trim($message);
        $norm = $this->normalize($raw);
        $ctxRaw = trim((string) $context);
        $ctx = $ctxRaw !== '' ? $this->normalize($ctxRaw) : '';

        if ($norm === '') {
            return $this->pack(
                'Cuéntame qué necesitas: un producto, una sección de la tienda o una duda rápida. Estoy para ayudarte.',
                $this->defaultLinks(),
                [],
                'empty'
            );
        }

        if ($this->isGreeting($norm) && ! $this->looksLikeProductRequest($norm) && ! $this->looksLikeBareProductQuery($norm)) {
            return $this->pack(
                '¡Hola! Qué gusto saludarte. Puedo recomendarte productos del catálogo o llevarte a carrito, favoritos, cotizaciones y más. ¿Qué estás buscando hoy?',
                $this->defaultLinks(),
                [],
                'greeting'
            );
        }

        if ($this->matchesWhole($norm, ['gracias', 'muchas gracias', 'mil gracias', 'thanks', 'thank you'])) {
            return $this->pack(
                '¡Con mucho gusto! Cuando quieras seguimos con otra búsqueda o sección.',
                [['label' => 'Ir al inicio', 'href' => '/']],
                [],
                'thanks'
            );
        }

        if ($this->isHelp($norm) && ! $this->looksLikeProductRequest($norm)) {
            return $this->pack(
                'Claro. Puedo recomendarte productos (ej. “busco memorias USB” o “monitor gaming”), abrirte secciones (“carrito”, “cotizaciones”) o afinar si me dices “me refería a cables”. ¿Por dónde empezamos?',
                $this->defaultLinks(),
                [],
                'help'
            );
        }

        if ($nav = $this->detectExplicitNavigation($norm)) {
            return $this->pack($nav['reply'], $nav['links'], [], 'navigation');
        }

        // Seguimiento: “¿de cuántos gigas?” / “¿de qué pulgadas?” sobre el tema del chat
        if ($this->isCapacityFollowUp($norm) && $ctx !== '') {
            $capacityAnswer = $this->answerCapacityFollowUp($raw, $norm, $sessionId, $userId, $ctxRaw, $ctx);
            if ($capacityAnswer !== null) {
                return $capacityAnswer;
            }
        }
        if ($this->isSizeFollowUp($norm) && $ctx !== '') {
            $sizeAnswer = $this->answerSizeFollowUp($raw, $norm, $sessionId, $userId, $ctxRaw, $ctx);
            if ($sizeAnswer !== null) {
                return $sizeAnswer;
            }
        }

        $query = $this->extractProductQuery($raw, $norm, $ctx, $ctxRaw);
        if ($query !== null) {
            return $this->searchProducts($query, $sessionId, $userId, $raw, $ctxRaw);
        }

        if ($cat = $this->detectCategoryBrowse($norm)) {
            return $this->pack($cat['reply'], $cat['links'], [], 'navigation');
        }

        // Sin patrón rígido: IA interpreta y, si propone búsqueda, mostramos catálogo
        return $this->conversationalWithCatalog($raw, $sessionId, $userId, $ctxRaw);
    }

    private function isGreeting(string $norm): bool
    {
        return $this->matchesWhole($norm, ['hola', 'buenas', 'buen dia', 'buen dias', 'hey', 'saludos', 'que tal', 'hola hola'])
            || preg_match('/^(hola|buenas|hey|saludos)\b/u', $norm) === 1;
    }

    private function isHelp(string $norm): bool
    {
        return $this->matchesWhole($norm, ['ayuda', 'help', 'opciones'])
            || $this->matchesAny($norm, ['que puedes', 'que haces', 'como funciona', 'como me ayudas']);
    }

    /**
     * @return array{reply: string, links: array<int, array{label: string, href: string}>}|null
     */
    private function detectExplicitNavigation(string $norm): ?array
    {
        $map = [
            [
                'keys' => ['ir al carrito', 'abrir carrito', 'ver carrito', 'mi carrito', 'al carrito'],
                'also' => ['carrito', 'checkout', 'bolsa de compra'],
                'requireShort' => true,
                'reply' => 'Perfecto, aquí tienes tu carrito para revisar lo que llevas y seguir con la compra cuando quieras.',
                'links' => [['label' => 'Abrir carrito', 'href' => '/tienda/carrito']],
            ],
            [
                'keys' => ['ir a favoritos', 'abrir favoritos', 'ver favoritos', 'mis favoritos'],
                'also' => ['favoritos', 'lista de deseos', 'wishlist'],
                'requireShort' => true,
                'reply' => 'En favoritos puedes guardar lo que te interese para retomarlo después. Si aún no inicias sesión, te pedirá entrar a tu cuenta.',
                'links' => [['label' => 'Ver favoritos', 'href' => '/favoritos']],
            ],
            [
                'keys' => ['mis cotizaciones', 'ver cotizaciones', 'ir a cotizaciones'],
                'also' => ['cotizacion', 'cotizaciones', 'presupuesto'],
                'requireShort' => true,
                'reply' => 'Claro. Puedes ver la cotización que estás armando o las que ya guardaste en tu cuenta.',
                'links' => [
                    ['label' => 'Cotización actual', 'href' => '/tienda/cotizaciones'],
                    ['label' => 'Mis cotizaciones', 'href' => '/dashboard?tab=cotizaciones'],
                ],
            ],
            [
                'keys' => ['mi cuenta', 'mi panel', 'ir al dashboard', 'abrir dashboard'],
                'also' => ['dashboard', 'mis pedidos', 'pedidos'],
                'requireShort' => true,
                'reply' => 'En tu panel de cliente ves pedidos, cotizaciones, chats y datos de la cuenta.',
                'links' => [
                    ['label' => 'Ir al dashboard', 'href' => '/dashboard'],
                    ['label' => 'Mis pedidos', 'href' => '/dashboard?tab=pedidos'],
                ],
            ],
            [
                'keys' => ['desarrolladores', 'ver desarrolladores', 'equipo de desarrollo'],
                'also' => ['desarrollador'],
                'requireShort' => true,
                'reply' => 'Con gusto: aquí puedes conocer al equipo de desarrollo del proyecto.',
                'links' => [['label' => 'Ver desarrolladores', 'href' => '/desarrolladores']],
            ],
            [
                'keys' => ['ir al inicio', 'pagina principal', 'volver al inicio'],
                'also' => ['inicio', 'home'],
                'requireShort' => true,
                'reply' => 'Te dejo el acceso al inicio de la tienda.',
                'links' => [['label' => 'Ir al inicio', 'href' => '/']],
            ],
            [
                'keys' => ['iniciar sesion', 'crear cuenta', 'registrarme', 'quiero registrarme'],
                'also' => ['login', 'registro'],
                'requireShort' => true,
                'reply' => 'Para guardar favoritos, pedidos y cotizaciones en la nube, entra o crea tu cuenta.',
                'links' => [
                    ['label' => 'Iniciar sesión', 'href' => '/login'],
                    ['label' => 'Crear cuenta', 'href' => '/register'],
                ],
            ],
            [
                'keys' => ['hablar con alguien', 'soporte humano', 'chat con admin', 'atencion al cliente'],
                'also' => ['chat admin', 'chat vendedor'],
                'requireShort' => false,
                'reply' => 'Si ya tienes cuenta, puedes escribirle al equipo desde el dashboard. Yo te ayudo con catálogo y navegación mientras tanto.',
                'links' => [
                    ['label' => 'Chat con administración', 'href' => '/dashboard?tab=chat'],
                    ['label' => 'Chat con ventas', 'href' => '/dashboard?tab=chat-vendedor'],
                ],
            ],
        ];

        foreach ($map as $item) {
            if ($this->matchesAny($norm, $item['keys'])) {
                return ['reply' => $item['reply'], 'links' => $item['links']];
            }
            $shortOk = ! ($item['requireShort'] ?? false) || mb_strlen($norm) <= 28;
            if ($shortOk && $this->matchesAny($norm, $item['also'] ?? []) && ! $this->looksLikeProductRequest($norm) && ! $this->isClarification($norm)) {
                return ['reply' => $item['reply'], 'links' => $item['links']];
            }
        }

        return null;
    }

    /**
     * @return array{reply: string, links: array<int, array{label: string, href: string}>}|null
     */
    private function detectCategoryBrowse(string $norm): ?array
    {
        if ($this->looksLikeProductRequest($norm) || $this->isClarification($norm)) {
            return null;
        }

        if (mb_strlen($norm) <= 28 && $this->matchesAny($norm, ['laptop', 'laptops', 'notebook'])) {
            return [
                'reply' => 'Si quieres explorar el apartado completo de laptops, aquí te dejo el enlace. Si prefieres, dime presupuesto o características y te sugiero modelos.',
                'links' => [['label' => 'Ver laptops', 'href' => '/tienda/laptops/ver-todo']],
            ];
        }

        if (mb_strlen($norm) <= 28 && $this->matchesAny($norm, ['monitor', 'monitores', 'pantalla'])) {
            return [
                'reply' => 'Puedes recorrer todos los monitores del catálogo, o decirme si buscas gaming, oficina, pulgadas, etc., y te recomiendo opciones concretas.',
                'links' => [['label' => 'Ver monitores', 'href' => '/tienda/monitores/ver-todo']],
            ];
        }

        return null;
    }

    private function looksLikeProductRequest(string $norm): bool
    {
        return $this->matchesAny($norm, [
            'busco', 'busca', 'buscar', 'búscame', 'necesito', 'recomienda', 'recomendame', 'recomendacion',
            'sugerencia', 'sugerir', 'sugiere', 'muestrame', 'muéstrame', 'ensename', 'enséñame',
            'tienes', 'tienen', 'hay',
        ]) || (
            str_contains($norm, 'quiero') && ($this->looksLikeBareProductQuery($norm) || $this->matchesAny($norm, ['usb', 'hdmi', 'producto']))
        );
    }

    private function looksLikeBareProductQuery(string $norm): bool
    {
        if (mb_strlen($norm) > 80) {
            return false;
        }

        return $this->matchesAny($norm, [
            'monitor', 'monitores', 'laptop', 'laptops', 'notebook', 'teclado', 'mouse', 'raton',
            'impresora', 'audifono', 'audifonos', 'headset', 'webcam', 'camara',
            'memoria', 'memorias', 'pendrive', 'flash drive', 'hub usb', 'cable', 'cables',
            'usb', 'hdmi', 'disco duro', 'ssd', 'router',
        ]);
    }

    private function isClarification(string $norm): bool
    {
        return $this->matchesAny($norm, [
            'me referia', 'me refería', 'referia a', 'refería a', 'en realidad', 'mejor',
            'quiero decir', 'era de', 'eran', 'no eso', 'no no', 'ahh', 'ah ',
            'a cables', 'a cable', 'a memorias', 'a memoria', 'a hubs', 'a hub',
            'los cables', 'las memorias', 'de cables', 'de memorias',
        ]);
    }

    /**
     * Preguntas de capacidad/tamaño sobre el producto del que ya hablábamos.
     */
    private function isCapacityFollowUp(string $norm): bool
    {
        if (preg_match('/\b\d+\s*(gb|tb|gigas?)\b/u', $norm) === 1) {
            return true;
        }

        return $this->matchesAny($norm, [
            'giga', 'gigas', 'capacidad', 'capacidades', 'almacenamiento', 'de cuantos', 'cuantos gb', 'cuantas gb',
            'que capacidades', 'que tamaños', 'que tamanos', 'que tamaños manejan', 'cuanto pesan',
            'de que capacidad', 'que capacidad',
        ]);
    }

    private function isStorageCapacityQuestion(string $norm): bool
    {
        return $this->matchesAny($norm, [
            'almacenamiento', 'giga', 'gigas', 'gb', 'tb', 'capacidad', 'capacidades',
        ]) && ! $this->matchesAny($norm, ['gbps', 'velocidad', 'transferencia']);
    }

    /**
     * @return array{reply: string, links: array<int, array{label: string, href: string}>, products: array<int, array<string, mixed>>, intent: string}|null
     */
    private function answerCapacityFollowUp(
        string $raw,
        string $norm,
        ?string $sessionId,
        ?int $userId,
        string $ctxRaw,
        string $ctxNorm
    ): ?array {
        $topic = $this->inferTopicQueryFromContext($ctxRaw, $ctxNorm, $norm);
        if ($topic === null || $topic === '') {
            // Pregunta de almacenamiento sin tema claro → memorias USB (lo habitual)
            if ($this->isStorageCapacityQuestion($norm)) {
                $topic = 'memoria usb';
            } else {
                return null;
            }
        }

        $topicNorm = $this->normalize($topic);
        // Cables/hubs no tienen “capacidad de almacenamiento” → corregir a memorias
        if ($this->isStorageCapacityQuestion($norm) && $this->matchesAny($topicNorm, ['cable', 'cables', 'hub', 'adaptador'])) {
            $topic = 'memoria usb';
            $topicNorm = 'memoria usb';
        }

        $wantedGb = $this->extractRequestedCapacityGb($norm);
        $pack = $this->buildCapacityAnswerForTopic($topic, $wantedGb, $sessionId, $userId);
        if ($pack !== null) {
            return $pack;
        }

        // Si el tema no trajo capacidades reales (ej. cables), reintentar con memorias
        if ($this->isStorageCapacityQuestion($norm) && $topicNorm !== 'memoria usb') {
            return $this->buildCapacityAnswerForTopic('memoria usb', $wantedGb, $sessionId, $userId);
        }

        return null;
    }

    /**
     * @return array{reply: string, links: array<int, array{label: string, href: string}>, products: array<int, array<string, mixed>>, intent: string}|null
     */
    private function buildCapacityAnswerForTopic(string $topic, ?int $wantedGb, ?string $sessionId, ?int $userId): ?array
    {
        $intent = $this->detectUsbFamilyIntent($this->normalize($topic));
        $variants = $this->expandSearchQueries($topic, $intent);

        $bestProducts = [];
        $bestQ = $topic;
        $bestScore = -1.0;

        foreach ($variants as $variant) {
            $resultado = $this->busqueda->buscar($variant, $sessionId, $userId);
            $ranked = $this->rankProductsByTitle($variant, array_slice($resultado['productos'] ?? [], 0, 30), $intent);
            if ($ranked['score'] > $bestScore && $ranked['productos'] !== []) {
                $bestScore = $ranked['score'];
                $bestProducts = $ranked['productos'];
                $bestQ = (string) ($resultado['texto_normalizado'] ?? $variant);
            }
            if ($bestScore >= 8.0 && count($bestProducts) >= 5) {
                break;
            }
        }

        if ($bestProducts === []) {
            return null;
        }

        $capacityMap = [];
        foreach ($bestProducts as $p) {
            $title = (string) ($p['descripcion'] ?? '');
            foreach ($this->extractStorageCapacities($title) as $cap) {
                $capacityMap[$cap] ??= [];
                $capacityMap[$cap][] = $p;
            }
        }

        // Sin capacidades de almacenamiento reales en títulos → no sirve este tema
        if ($capacityMap === []) {
            return null;
        }

        $sortedCaps = array_keys($capacityMap);
        usort($sortedCaps, function (string $a, string $b) {
            return $this->capacityToGb($a) <=> $this->capacityToGb($b);
        });

        if ($wantedGb !== null) {
            $label = $wantedGb >= 1024
                ? (rtrim(rtrim(number_format($wantedGb / 1024, 1, '.', ''), '0'), '.').'TB')
                : ($wantedGb.'GB');
            $matched = [];
            foreach ($capacityMap as $cap => $items) {
                if ($this->capacityToGb($cap) === $wantedGb) {
                    foreach ($items as $item) {
                        $key = (string) ($item['clave'] ?? '');
                        if ($key !== '') {
                            $matched[$key] = $item;
                        }
                    }
                }
            }
            $matched = array_values($matched);
            if ($matched === []) {
                $capsText = implode(', ', array_slice($sortedCaps, 0, 8));

                return $this->pack(
                    "Sobre «{$bestQ}», no vi opciones claras de {$label}. Las capacidades que sí aparecen son: {$capsText}. ¿Probamos con otra?",
                    [
                        ['label' => 'Ver todos los resultados', 'href' => '/tienda/busqueda?q='.rawurlencode($bestQ)],
                    ],
                    $this->mapProducts(array_slice($bestProducts, 0, 5)),
                    'capacity_followup_miss'
                );
            }

            return $this->pack(
                "Sí: en «{$bestQ}» tengo opciones de {$label}. Te dejo algunas:",
                [
                    ['label' => 'Ver todos los resultados', 'href' => '/tienda/busqueda?q='.rawurlencode(trim($bestQ.' '.$label))],
                ],
                $this->mapProducts(array_slice($matched, 0, 5)),
                'capacity_followup'
            );
        }

        $capsText = implode(', ', array_slice($sortedCaps, 0, 10));
        $diverse = [];
        foreach ($sortedCaps as $cap) {
            foreach ($capacityMap[$cap] as $p) {
                $clave = (string) ($p['clave'] ?? '');
                if ($clave === '' || isset($diverse[$clave])) {
                    continue;
                }
                $diverse[$clave] = $p;
                break;
            }
            if (count($diverse) >= 5) {
                break;
            }
        }

        return $this->pack(
            "En «{$bestQ}» manejo sobre todo estas capacidades de almacenamiento: {$capsText}. ¿Cuál te late (por ejemplo 32GB o 64GB)? Te dejo una muestra:",
            [
                ['label' => 'Ver todos los resultados', 'href' => '/tienda/busqueda?q='.rawurlencode($bestQ)],
            ],
            $this->mapProducts(array_values($diverse)),
            'capacity_followup'
        );
    }

    private function inferTopicQueryFromContext(string $ctxRaw, string $ctxNorm, string $questionNorm = ''): ?string
    {
        $storageQ = $questionNorm !== '' && $this->isStorageCapacityQuestion($questionNorm);

        // 1) Priorizar la última búsqueda del USUARIO (no frases del bot tipo “cables en vez de…”)
        $lines = preg_split('/\r\n|\n|\r/', $ctxRaw) ?: [];
        for ($i = count($lines) - 1; $i >= 0; $i--) {
            $line = trim($lines[$i]);
            if (! preg_match('/^user:\s*(.+)$/iu', $line, $um)) {
                continue;
            }
            $userText = trim($um[1]);
            $userNorm = $this->normalize($userText);
            if ($this->isCapacityFollowUp($userNorm) || $this->isSizeFollowUp($userNorm) || $this->isGreeting($userNorm)) {
                continue;
            }
            if ($this->looksLikeProductRequest($userNorm) || $this->looksLikeBareProductQuery($userNorm) || $this->isClarification($userNorm)) {
                $q = $this->isClarification($userNorm)
                    ? ($this->queryFromClarification($userText, $userNorm, $ctxNorm) ?? $this->cleanQuery($userText))
                    : $this->cleanQuery($userText);
                if ($q === '') {
                    continue;
                }
                $q = $this->stemQuery($q);
                $qNorm = $this->normalize($q);
                if ($storageQ && $this->matchesAny($qNorm, ['cable', 'cables', 'hub', 'adaptador'])) {
                    // El usuario preguntó almacenamiento: no heredar cables de un turno intermedio
                    continue;
                }

                return $q;
            }
        }

        // 2) Comillas «tema» del historial: preferir memorias si la pregunta es de almacenamiento
        if (preg_match_all('/«([^»]{2,60})»/u', $ctxRaw, $m)) {
            $quotes = array_map(fn ($q) => $this->stemQuery($this->cleanQuery(trim((string) $q))), $m[1]);
            $quotes = array_values(array_filter($quotes));
            if ($storageQ) {
                foreach (array_reverse($quotes) as $q) {
                    $qn = $this->normalize($q);
                    if ($this->matchesAny($qn, ['memoria', 'ssd', 'disco', 'almacen']) || (str_contains($qn, 'usb') && ! $this->matchesAny($qn, ['cable', 'hub', 'adaptador']))) {
                        return $q;
                    }
                }
            }
            $last = (string) end($quotes);
            if ($last !== '') {
                $lastNorm = $this->normalize($last);
                if ($storageQ && $this->matchesAny($lastNorm, ['cable', 'cables', 'hub', 'adaptador'])) {
                    return 'memoria usb';
                }

                return $last;
            }
        }

        if ($storageQ || $this->matchesAny($ctxNorm, ['memoria usb', 'memorias usb', 'memoria'])) {
            return 'memoria usb';
        }

        if ($this->matchesAny($ctxNorm, ['usb']) && ! $this->matchesAny($ctxNorm, ['cable'])) {
            return 'memoria usb';
        }

        if ($this->matchesAny($ctxNorm, ['monitor', 'laptop', 'teclado', 'mouse', 'impresora'])) {
            foreach (['monitor', 'laptop', 'teclado', 'mouse', 'impresora'] as $term) {
                if (str_contains($ctxNorm, $term)) {
                    return $term;
                }
            }
        }

        return null;
    }

    private function extractRequestedCapacityGb(string $norm): ?int
    {
        if (preg_match('/\b(\d+)\s*(tb|terabytes?)\b/u', $norm, $m)) {
            return ((int) $m[1]) * 1024;
        }
        if (preg_match('/\b(\d+)\s*(gb|gigas?|gigabytes?)\b/u', $norm, $m)) {
            return (int) $m[1];
        }

        return null;
    }

    /**
     * Capacidades de almacenamiento en el título (no velocidades Gbps).
     *
     * @return array<int, string>  ej. ["16GB","32GB"]
     */
    private function extractStorageCapacities(string $title): array
    {
        $t = $this->normalize($title);
        // Quitar velocidades para no confundir “5gbps” con “gigas”
        $t = preg_replace('/\b\d+\s*gb\s*ps\b/u', ' ', $t) ?? $t;
        $t = preg_replace('/\b\d+\s*gbps\b/u', ' ', $t) ?? $t;
        $t = preg_replace('/\b\d+\s*mb\s*s\b/u', ' ', $t) ?? $t;

        $out = [];
        if (preg_match_all('/\b(\d+)\s*(gb|tb)\b/u', $t, $m, PREG_SET_ORDER)) {
            foreach ($m as $row) {
                $n = (int) $row[1];
                $u = strtoupper($row[2]);
                // Filtrar números absurdos de “capacidad” (años, hz colados, etc.)
                if ($u === 'GB' && ($n < 1 || $n > 8192)) {
                    continue;
                }
                if ($u === 'TB' && ($n < 1 || $n > 32)) {
                    continue;
                }
                $out[] = $n.$u;
            }
        }

        return array_values(array_unique($out));
    }

    private function capacityToGb(string $cap): int
    {
        if (preg_match('/^(\d+)TB$/i', $cap, $m)) {
            return ((int) $m[1]) * 1024;
        }
        if (preg_match('/^(\d+)GB$/i', $cap, $m)) {
            return (int) $m[1];
        }

        return 0;
    }

    private function extractProductQuery(string $raw, string $norm, string $ctxNorm, string $ctxRaw = ''): ?string
    {
        // Seguimiento: “me refería a cables usb”, “mejor memorias”, etc.
        if ($this->isClarification($norm)) {
            return $this->queryFromClarification($raw, $norm, $ctxNorm);
        }

        // Corrección corta con contexto previo de USB/búsqueda
        if ($ctxNorm !== '' && $this->matchesAny($norm, ['cable', 'cables', 'hub', 'adaptador', 'memoria', 'memorias', 'pendrive'])
            && $this->matchesAny($ctxNorm, ['usb', 'memoria', 'cable', 'busco', 'busca', 'hub'])) {
            $fromClarify = $this->queryFromClarification($raw, $norm, $ctxNorm);
            if ($fromClarify !== null) {
                return $fromClarify;
            }
        }

        if ($this->matchesAny($norm, ['sugerencia', 'recomendacion', 'recomendame', 'mas especifico', 'en especifico', 'alguno concreto', 'cual me recomiendas', 'otra opcion', 'otras opciones'])) {
            if ($ctxNorm !== '') {
                $fromCtx = $this->cleanQuery($this->lastUserLine($ctxRaw) ?: $ctxNorm);
                if ($fromCtx !== '') {
                    return $fromCtx;
                }
            }
        }

        if ($this->looksLikeProductRequest($norm) || $this->looksLikeBareProductQuery($norm)) {
            $cleaned = $this->cleanQuery($raw);

            return $cleaned !== '' ? $cleaned : null;
        }

        return null;
    }

    private function queryFromClarification(string $raw, string $norm, string $ctxNorm): ?string
    {
        $cleaned = $this->cleanQuery($raw);
        $cleanedNorm = $this->normalize($cleaned);

        // Quitar muletillas de corrección
        $cleanedNorm = trim(preg_replace(
            '/\b(me referia a|me referia|referia a|en realidad|quiero decir|mejor|ahh?|no eso|no|era|eran|los|las|de)\b/u',
            ' ',
            $cleanedNorm
        ) ?? $cleanedNorm);
        $cleanedNorm = trim(preg_replace('/\s+/', ' ', $cleanedNorm) ?? $cleanedNorm);

        if ($cleanedNorm === '' && $this->matchesAny($norm, ['cable', 'cables'])) {
            $cleanedNorm = $this->matchesAny($ctxNorm, ['usb']) ? 'cable usb' : 'cable';
        }
        if ($cleanedNorm === '' && $this->matchesAny($norm, ['memoria', 'memorias', 'pendrive'])) {
            $cleanedNorm = $this->matchesAny($ctxNorm, ['usb']) || $this->matchesAny($ctxNorm, ['usb']) ? 'memoria usb' : 'memoria';
        }
        if ($cleanedNorm === 'cables' || $cleanedNorm === 'cable') {
            $cleanedNorm = $this->matchesAny($ctxNorm, ['usb']) ? 'cable usb' : $cleanedNorm;
        }
        if ($cleanedNorm === 'memorias' || $cleanedNorm === 'memoria') {
            $cleanedNorm = ($this->matchesAny($ctxNorm, ['usb']) || $ctxNorm === '') ? 'memoria usb' : $cleanedNorm;
        }

        // Si solo dice “cables usb” / “memorias” etc.
        if ($cleanedNorm !== '') {
            return $cleanedNorm;
        }

        return null;
    }

    private function lastUserLine(string $ctxRaw): string
    {
        if ($ctxRaw === '') {
            return '';
        }
        $lines = preg_split('/\r\n|\n|\r/', $ctxRaw) ?: [];
        for ($i = count($lines) - 1; $i >= 0; $i--) {
            $line = trim($lines[$i]);
            if ($line === '') {
                continue;
            }
            if (preg_match('/^user:\s*(.+)$/iu', $line, $m)) {
                return trim($m[1]);
            }
        }

        return trim($lines[count($lines) - 1] ?? '');
    }

    private function isSizeFollowUp(string $norm): bool
    {
        if (preg_match('/\b\d+\s*(pulgadas?|"|in|inch|inches)\b/u', $norm) === 1) {
            return true;
        }

        return $this->matchesAny($norm, [
            'pulgada', 'pulgadas', 'de que pulgadas', 'que pulgadas', 'que tamanos', 'que tamaños',
            'que medidas', 'de que tamaño', 'de que tamano', 'pantalla de',
        ]);
    }

    /**
     * @return array{reply: string, links: array<int, array{label: string, href: string}>, products: array<int, array<string, mixed>>, intent: string}|null
     */
    private function answerSizeFollowUp(
        string $raw,
        string $norm,
        ?string $sessionId,
        ?int $userId,
        string $ctxRaw,
        string $ctxNorm
    ): ?array {
        $topic = $this->inferTopicQueryFromContext($ctxRaw, $ctxNorm, $norm);
        if ($topic === null || $topic === '') {
            if ($this->matchesAny($ctxNorm, ['monitor', 'laptop', 'pantalla', 'tv'])) {
                $topic = $this->matchesAny($ctxNorm, ['samsung']) ? 'monitor samsung' : 'monitor';
            } else {
                return null;
            }
        }

        $topicNorm = $this->normalize($topic);
        // Nunca resolver pulgadas con cables/hubs/memorias USB
        if (
            $this->matchesAny($topicNorm, ['cable', 'cables', 'hub', 'adaptador', 'memoria', 'pendrive'])
            || ($this->matchesAny($topicNorm, ['usb']) && ! $this->matchesAny($topicNorm, ['monitor', 'laptop', 'pantalla', 'tv', 'samsung']))
        ) {
            if ($this->matchesAny($ctxNorm, ['monitor'])) {
                $topic = $this->matchesAny($ctxNorm, ['samsung']) ? 'monitor samsung' : 'monitor';
            } else {
                $topic = 'monitor';
            }
            $topicNorm = $this->normalize($topic);
        }

        $wantedInches = $this->extractRequestedInches($norm);
        $intent = $this->detectUsbFamilyIntent($topicNorm); // null for monitors
        $variants = $this->expandSearchQueries($topic, $intent);
        // Asegurar variantes de monitor
        if ($this->matchesAny($topicNorm, ['monitor', 'samsung', 'laptop'])) {
            array_unshift($variants, $topic, $this->stemQuery($topic), 'monitor samsung', 'monitores samsung', 'monitor');
            $variants = array_values(array_unique(array_filter($variants)));
        }

        $bestProducts = [];
        $bestQ = $topic;
        $bestScore = -1.0;
        foreach ($variants as $variant) {
            $resultado = $this->busqueda->buscar($variant, $sessionId, $userId);
            $ranked = $this->rankProductsByTitle($variant, array_slice($resultado['productos'] ?? [], 0, 30), null);
            // Filtrar: quedarnos con productos que parezcan monitores/laptops si el tema lo es
            $ranked['productos'] = array_values(array_filter(
                $ranked['productos'],
                fn ($p) => $this->looksLikeDisplayProduct((string) ($p['descripcion'] ?? ''))
                    || ! $this->matchesAny($topicNorm, ['monitor', 'laptop', 'pantalla', 'tv', 'samsung'])
            ));
            if ($ranked['productos'] === []) {
                continue;
            }
            // Recalcular score simple
            $score = count($ranked['productos']) > 0 ? max(3.0, $ranked['score']) : 0;
            if ($score > $bestScore) {
                $bestScore = $score;
                $bestProducts = $ranked['productos'];
                $bestQ = (string) ($resultado['texto_normalizado'] ?? $variant);
            }
            if (count($bestProducts) >= 5 && $bestScore >= 5) {
                break;
            }
        }

        if ($bestProducts === []) {
            return null;
        }

        $sizeMap = [];
        foreach ($bestProducts as $p) {
            $title = (string) ($p['descripcion'] ?? '');
            foreach ($this->extractInchesFromTitle($title) as $inch) {
                $sizeMap[$inch] ??= [];
                $sizeMap[$inch][] = $p;
            }
        }
        if ($sizeMap === []) {
            return $this->pack(
                "Sobre «{$bestQ}» sí hay opciones, pero no pude leer bien las pulgadas en los títulos. ¿Me dices un tamaño (ej. 27 o 32)?",
                [['label' => 'Ver todos los resultados', 'href' => '/tienda/busqueda?q='.rawurlencode($bestQ)]],
                $this->mapProducts(array_slice($bestProducts, 0, 5)),
                'size_followup'
            );
        }

        $sizes = array_keys($sizeMap);
        sort($sizes, SORT_NUMERIC);

        if ($wantedInches !== null) {
            $matched = $sizeMap[$wantedInches] ?? [];
            if ($matched === []) {
                return $this->pack(
                    "En «{$bestQ}» no vi claro de {$wantedInches}\". Las pulgadas que sí aparecen: ".implode(', ', array_map(fn ($s) => $s.'"', array_slice($sizes, 0, 10))).'. ¿Cuál te late?',
                    [['label' => 'Ver todos los resultados', 'href' => '/tienda/busqueda?q='.rawurlencode($bestQ)]],
                    $this->mapProducts(array_slice($bestProducts, 0, 5)),
                    'size_followup_miss'
                );
            }

            return $this->pack(
                "Sí: en «{$bestQ}» tengo opciones de {$wantedInches}\". Te dejo algunas:",
                [['label' => 'Ver todos los resultados', 'href' => '/tienda/busqueda?q='.rawurlencode(trim($bestQ.' '.$wantedInches))]],
                $this->mapProducts(array_slice($matched, 0, 5)),
                'size_followup'
            );
        }

        $diverse = [];
        foreach ($sizes as $inch) {
            foreach ($sizeMap[$inch] as $p) {
                $clave = (string) ($p['clave'] ?? '');
                if ($clave === '' || isset($diverse[$clave])) {
                    continue;
                }
                $diverse[$clave] = $p;
                break;
            }
            if (count($diverse) >= 5) {
                break;
            }
        }

        $sizesText = implode(', ', array_map(fn ($s) => $s.'"', array_slice($sizes, 0, 12)));

        return $this->pack(
            "En «{$bestQ}» veo sobre todo estas pulgadas: {$sizesText}. ¿Cuál te late (ej. 27 o 32)? Te dejo una muestra:",
            [['label' => 'Ver todos los resultados', 'href' => '/tienda/busqueda?q='.rawurlencode($bestQ)]],
            $this->mapProducts(array_values($diverse)),
            'size_followup'
        );
    }

    private function looksLikeDisplayProduct(string $title): bool
    {
        $t = $this->normalize($title);

        return $this->matchesAny($t, ['monitor', 'laptop', 'notebook', 'pantalla', 'display', 'odyssey', 'ultrawide'])
            && ! $this->matchesAny($t, ['cable', 'memoria usb', 'hub usb']);
    }

    private function extractRequestedInches(string $norm): ?int
    {
        if (preg_match('/\b(\d{2,3})\s*(pulgadas?|"|in|inch|inches)?\b/u', $norm, $m)) {
            $n = (int) $m[1];
            if ($n >= 13 && $n <= 100) {
                return $n;
            }
        }

        return null;
    }

    /**
     * @return array<int, int>
     */
    private function extractInchesFromTitle(string $title): array
    {
        $t = $this->normalize($title);
        $out = [];
        if (preg_match_all('/\b(\d{2,3})\s*(pulgadas?|"|in|inch|inches)?\b/u', $t, $m, PREG_SET_ORDER)) {
            foreach ($m as $row) {
                $n = (int) $row[1];
                // Evitar años / hz / códigos sueltos: preferir con unidad o rangos típicos de pantalla
                $hasUnit = isset($row[2]) && $row[2] !== '';
                if ($hasUnit && $n >= 13 && $n <= 100) {
                    $out[] = $n;
                } elseif (! $hasUnit && $n >= 21 && $n <= 55 && preg_match('/\b(monitor|pantalla|odyssey|laptop|notebook)\b/u', $t) === 1) {
                    $out[] = $n;
                }
            }
        }
        // Patrones frecuentes en catálogo: "27 /" o "49 PULGADAS"
        if (preg_match_all('/\b(\d{2,3})\s*pulgadas?\b/u', $t, $m2)) {
            foreach ($m2[1] as $n) {
                $n = (int) $n;
                if ($n >= 13 && $n <= 100) {
                    $out[] = $n;
                }
            }
        }

        return array_values(array_unique($out));
    }

    private function cleanQuery(string $raw): string
    {
        $q = trim($raw);
        $q = preg_replace(
            '/^(por\s+favor\s+|ok\s+|oka\s+|va\s+|vale\s+|bueno\s+|hey\s+)?(me\s+)?(puedes\s+)?(busco|busca(r|me)?|búscame|necesito|quiero)\s+/iu',
            '',
            $q
        );
        $q = preg_replace('/^(va|vale|ok|oka|bueno|hey)[,\s]+/iu', '', (string) $q);
        $q = preg_replace(
            '/\b(me\s+)?(recomienda(s|me)?|recomendacion|sugiere(s|me)?|sugerencia|muestra(me)?|muéstrame|dame|tienes|tienen|alguno|alguna|algunos|algunas)\b/iu',
            ' ',
            (string) $q
        );
        $q = preg_replace(
            '/\b(un|una|unos|unas|el|la|los|las|de|para|por|favor|en\s+especifico|especifico|específico|concreto|concreta)\b/iu',
            ' ',
            (string) $q
        );
        $q = trim(preg_replace('/\s+/', ' ', (string) $q) ?? '');

        return $q !== '' ? $q : trim($raw);
    }

    /**
     * @return array{reply: string, links: array<int, array{label: string, href: string}>, products: array<int, array<string, mixed>>, intent: string}
     */
    private function searchProducts(string $query, ?string $sessionId, ?int $userId, string $original, string $ctxRaw = ''): array
    {
        $intent = $this->detectUsbFamilyIntent($this->normalize($query.' '.$original));
        $variants = $this->expandSearchQueries($query, $intent);

        $best = [
            'productos' => [],
            'q' => $query,
            'corregido' => false,
            'score' => -1.0,
        ];

        foreach ($variants as $variant) {
            $resultado = $this->busqueda->buscar($variant, $sessionId, $userId);
            $lista = array_slice($resultado['productos'] ?? [], 0, 20);
            $ranked = $this->rankProductsByTitle($variant, $lista, $intent);
            $score = $ranked['score'];
            if ($score > $best['score'] && $ranked['productos'] !== []) {
                $best = [
                    'productos' => $ranked['productos'],
                    'q' => (string) ($resultado['texto_normalizado'] ?? $variant),
                    'corregido' => (bool) ($resultado['correccion_aplicada'] ?? false),
                    'score' => $score,
                ];
            }
            // Suficientemente bueno: no hace falta seguir
            if ($score >= 8.0 && count($ranked['productos']) >= 3) {
                break;
            }
        }

        $productos = array_slice($best['productos'], 0, 5);
        $qNorm = $best['q'];

        if ($productos === []) {
            return $this->conversationalWithCatalog($original, $sessionId, $userId, $ctxRaw, $query);
        }

        $note = null;
        if ($intent === 'usb_memory' && $this->normalize($query) === 'usb') {
            $note = 'Te muestro memorias USB del catálogo (lo más habitual). Si en realidad eran cables, hubs o adaptadores, dímelo y te cambio los resultados.';
        } elseif ($intent === 'usb_cable') {
            $note = 'Perfecto, aquí van opciones de cables USB según lo que comentas.';
        }

        return $this->pack(
            $this->productReply($original, $productos, $best['corregido'], $qNorm, $note),
            [
                ['label' => 'Ver todos los resultados', 'href' => '/tienda/busqueda?q='.rawurlencode($qNorm)],
                ['label' => 'Abrir búsqueda', 'href' => '/tienda/busqueda'],
            ],
            $this->mapProducts($productos),
            'product_search'
        );
    }

    /**
     * usb_memory | usb_cable | usb_hub | usb_adapter | usb_general | null
     */
    private function detectUsbFamilyIntent(string $norm): ?string
    {
        if (! str_contains($norm, 'usb') && ! $this->matchesAny($norm, ['pendrive', 'flash drive', 'memoria flash'])) {
            return null;
        }
        if ($this->matchesAny($norm, ['cable', 'cables'])) {
            return 'usb_cable';
        }
        if ($this->matchesAny($norm, ['hub', 'hubs', 'multipuerto'])) {
            return 'usb_hub';
        }
        if ($this->matchesAny($norm, ['adaptador', 'adaptadores', 'converter', 'conversor'])) {
            return 'usb_adapter';
        }
        if ($this->matchesAny($norm, ['memoria', 'memorias', 'pendrive', 'flash', 'almacenamiento'])) {
            return 'usb_memory';
        }
        // “USB” solo → preferimos memorias (como en la tienda)
        return 'usb_memory';
    }

    /**
     * @return array<int, string>
     */
    private function expandSearchQueries(string $query, ?string $intent): array
    {
        $stemmed = $this->stemQuery($query);
        $out = [];

        $push = function (string $q) use (&$out) {
            $q = trim(preg_replace('/\s+/', ' ', $q) ?? $q);
            if ($q !== '') {
                $out[] = $q;
            }
        };

        $push($stemmed);
        $push($query);

        if ($intent === 'usb_memory' || $intent === null && str_contains($this->normalize($query), 'usb')) {
            $push('memoria usb');
            $push('memorias usb');
            $push('usb 32gb');
            $push('usb 16gb');
            $push('sandisk usb');
            $push('adata usb');
        }
        if ($intent === 'usb_cable') {
            $push('cable usb');
            $push('cables usb');
            $push('usb c cable');
            $push('cable usb c');
        }
        if ($intent === 'usb_hub') {
            $push('hub usb');
            $push('usb hub');
        }
        if ($intent === 'usb_adapter') {
            $push('adaptador usb');
            $push('usb adaptador');
        }

        foreach ($this->productQueryFallbacks($query) as $fb) {
            $push($this->stemQuery($fb));
            $push($fb);
        }

        return array_values(array_unique($out));
    }

    private function stemQuery(string $query): string
    {
        $tokens = $this->significantTokens($query);
        $stemmed = array_map(fn (string $t) => $this->stemToken($t), $tokens);

        return trim(implode(' ', $stemmed));
    }

    private function stemToken(string $token): string
    {
        $t = $this->normalize($token);
        $map = [
            'memorias' => 'memoria',
            'cables' => 'cable',
            'adaptadores' => 'adaptador',
            'monitores' => 'monitor',
            'laptops' => 'laptop',
            'teclados' => 'teclado',
            'impresoras' => 'impresora',
            'audifonos' => 'audifono',
            'hubs' => 'hub',
        ];
        if (isset($map[$t])) {
            return $map[$t];
        }
        if (str_ends_with($t, 'es') && mb_strlen($t) > 4) {
            return mb_substr($t, 0, -2);
        }
        if (str_ends_with($t, 's') && ! str_ends_with($t, 'ss') && mb_strlen($t) > 3) {
            return mb_substr($t, 0, -1);
        }

        return $t;
    }

    /**
     * @param  array<int, array<string, mixed>>  $productos
     * @return array{productos: array<int, array<string, mixed>>, score: float}
     */
    private function rankProductsByTitle(string $query, array $productos, ?string $intent): array
    {
        $tokens = $this->significantTokens($this->stemQuery($query));
        if ($tokens === [] || $productos === []) {
            return ['productos' => [], 'score' => 0.0];
        }

        $scored = [];
        foreach ($productos as $p) {
            $title = $this->normalize((string) ($p['descripcion'] ?? ''));
            $hay = $this->normalize(implode(' ', [
                $title,
                (string) ($p['clave'] ?? ''),
                (string) ($p['marca'] ?? ''),
                (string) ($p['categoria'] ?? ''),
                (string) ($p['subcategoria'] ?? ''),
            ]));
            if ($title === '' && $hay === '') {
                continue;
            }

            $score = 0.0;
            $hits = 0;
            foreach ($tokens as $t) {
                if ($this->tokenInText($t, $title)) {
                    $hits++;
                    $score += 3.0;
                } elseif ($this->tokenInText($t, $hay)) {
                    $hits++;
                    $score += 1.0;
                }
            }

            if ($hits === 0) {
                continue;
            }

            // Penalizar PCs/monitores cuando la intención es accesorio USB
            if ($intent !== null && str_starts_with($intent, 'usb_') && $this->looksLikeComputerOrDisplay($hay)) {
                if (! $this->looksLikeUsbAccessory($hay)) {
                    continue;
                }
                $score -= 5.0;
            }

            if ($intent === 'usb_memory') {
                if ($this->looksLikeUsbMemoryTitle($title) || $this->looksLikeUsbMemoryTitle($hay)) {
                    $score += 6.0;
                } elseif (! $this->looksLikeUsbAccessory($hay)) {
                    continue;
                }
            }
            if ($intent === 'usb_cable' && ! $this->looksLikeCableOrAdapter($hay, 'usb') && ! str_contains($title, 'cable')) {
                continue;
            }

            // Bonus si el título empieza como el producto buscado
            if (preg_match('/^memoria\b/u', $title) === 1 && ($intent === 'usb_memory' || in_array('memoria', $tokens, true))) {
                $score += 4.0;
            }

            $scored[] = ['p' => $p, 'score' => $score];
        }

        usort($scored, fn ($a, $b) => $b['score'] <=> $a['score']);
        $scored = array_values(array_filter($scored, fn ($row) => $row['score'] >= 3.0));

        $bestScore = $scored[0]['score'] ?? 0.0;

        return [
            'productos' => array_map(fn ($row) => $row['p'], $scored),
            'score' => (float) $bestScore,
        ];
    }

    private function tokenInText(string $token, string $text): bool
    {
        if ($token === '' || $text === '') {
            return false;
        }
        if (str_contains($text, $token)) {
            return true;
        }
        $stem = $this->stemToken($token);
        if ($stem !== $token && str_contains($text, $stem)) {
            return true;
        }
        foreach (preg_split('/\s+/', $text) ?: [] as $w) {
            if ($this->stemToken($w) === $stem) {
                return true;
            }
        }

        return false;
    }

    private function looksLikeUsbMemoryTitle(string $hay): bool
    {
        return preg_match('/\bmemoria\b.*\busb\b/u', $hay) === 1
            || preg_match('/\busb\b.*\b(gb|tb)\b/u', $hay) === 1
            || preg_match('/\b(pendrive|flash\s*drive|cruzer|uv\d+|cruzer\s*blade)\b/u', $hay) === 1;
    }

    private function looksLikeComputerOrDisplay(string $hay): bool
    {
        return preg_match(
            '/\b(monitor|laptop|notebook|mini\s*pc|chromebox|videoproyector|proyector|impresora|all\s*in\s*one|desktop|cpu|gabinete)\b/u',
            $hay
        ) === 1;
    }

    private function looksLikeUsbAccessory(string $hay): bool
    {
        if ($this->looksLikeUsbMemoryTitle($hay)) {
            return true;
        }
        if ($this->looksLikeComputerOrDisplay($hay)) {
            return false;
        }

        return preg_match(
            '/\b(memoria|hub|cable|adaptador|extensor|pendrive|flash|llave|multipuerto|dock)\b.*\busb\b|\busb\b.*\b(memoria|hub|cable|adaptador|pendrive|flash|gb|tb)\b/u',
            $hay
        ) === 1;
    }

    private function looksLikeCableOrAdapter(string $hay, string $term): bool
    {
        if ($this->looksLikeComputerOrDisplay($hay)) {
            return false;
        }
        $t = preg_quote($term, '/');

        return preg_match('/\b(cable|adaptador|extensor|conversor|switch)\b.*\b'.$t.'\b/u', $hay) === 1
            || preg_match('/\b'.$t.'\b.*\b(cable|adaptador|extensor|conversor)\b/u', $hay) === 1;
    }

    /**
     * @return array<int, string>
     */
    private function productQueryFallbacks(string $text): array
    {
        $norm = $this->normalize($text);
        $terms = [];
        foreach (['monitores', 'monitor', 'laptops', 'laptop', 'teclado', 'mouse', 'impresora', 'gaming', 'gamer', 'memoria', 'cable', 'usb'] as $term) {
            if (str_contains($norm, $term)) {
                $terms[] = $this->stemToken($term);
            }
        }

        return array_values(array_unique(array_filter($terms)));
    }

    /**
     * IA + intento de catálogo (para convivir / frases libres).
     *
     * @return array{reply: string, links: array<int, array{label: string, href: string}>, products: array<int, array<string, mixed>>, intent: string}
     */
    private function conversationalWithCatalog(string $raw, ?string $sessionId, ?int $userId, string $ctxRaw = '', ?string $hintQuery = null): array
    {
        $norm = $this->normalize($raw);
        // No buscar literalmente “gigas/pulgadas” sin tema previo
        if (($this->isCapacityFollowUp($norm) || $this->isSizeFollowUp($norm)) && $hintQuery === null) {
            return $this->fallbackWithIa(
                $raw,
                $ctxRaw,
                'El cliente pregunta por capacidad o tamaño. Usa el historial del chat. No inventes productos. No menciones cables USB si el tema es monitores u otra categoría.'
            );
        }

        $guess = $hintQuery ?: $this->cleanQuery($raw);
        if ($guess !== '') {
            $intent = $this->detectUsbFamilyIntent($this->normalize($guess.' '.$raw.' '.$ctxRaw));
            foreach ($this->expandSearchQueries($guess, $intent) as $variant) {
                $resultado = $this->busqueda->buscar($variant, $sessionId, $userId);
                $ranked = $this->rankProductsByTitle($variant, array_slice($resultado['productos'] ?? [], 0, 20), $intent);
                if ($ranked['productos'] !== [] && $ranked['score'] >= 3.0) {
                    $productos = array_slice($ranked['productos'], 0, 5);
                    $qNorm = (string) ($resultado['texto_normalizado'] ?? $variant);

                    return $this->pack(
                        $this->productReply($raw, $productos, false, $qNorm, 'Claro, encontré esto en el catálogo según lo que me dices'),
                        [
                            ['label' => 'Ver todos los resultados', 'href' => '/tienda/busqueda?q='.rawurlencode($qNorm)],
                        ],
                        $this->mapProducts($productos),
                        'product_search_soft'
                    );
                }
            }
        }

        return $this->fallbackWithIa($raw, $ctxRaw);
    }

    /**
     * @param  array<int, array<string, mixed>>  $productos
     */
    private function productReply(string $query, array $productos, bool $corregido, string $qNorm, ?string $note = null): string
    {
        $n = count($productos);
        $names = [];
        foreach (array_slice($productos, 0, 2) as $p) {
            $desc = trim((string) ($p['descripcion'] ?? ''));
            if ($desc !== '') {
                $names[] = Str::limit($desc, 52, '…');
            }
        }
        $mention = $names !== [] ? ' Por ejemplo: '.implode(' · ', $names).'.' : '';
        $prefix = $note ? rtrim($note, '.').'. ' : '';

        if ($corregido && $qNorm !== '') {
            return $prefix."Encontré {$n} ".($n === 1 ? 'opción' : 'opciones')." en catálogo para «{$qNorm}».{$mention} Si quieres afinar (marca, tamaño, presupuesto…), dímelo y lo ajustamos.";
        }

        return $prefix."Encontré {$n} ".($n === 1 ? 'opción' : 'opciones')." en el catálogo.{$mention} Revisa las tarjetas o abre “Ver todos los resultados”; si no era eso, corrígeme y busco de nuevo.";
    }

    /**
     * @param  array<int, array<string, mixed>>  $productos
     * @return array<int, array<string, mixed>>
     */
    private function mapProducts(array $productos): array
    {
        $out = [];
        foreach ($productos as $p) {
            $clave = (string) ($p['clave'] ?? '');
            if ($clave === '') {
                continue;
            }
            $out[] = [
                'clave' => $clave,
                'descripcion' => (string) ($p['descripcion'] ?? $clave),
                'marca' => (string) ($p['marca'] ?? ''),
                'precio' => $p['precio'] ?? null,
                'imagen' => $p['imagen'] ?? ($p['imagenes'][0] ?? null),
                'href' => '/tienda/producto/'.rawurlencode($clave),
            ];
        }

        return $out;
    }

    /**
     * @return array{reply: string, links: array<int, array{label: string, href: string}>, products: array<int, array<string, mixed>>, intent: string}
     */
    private function fallbackWithIa(string $raw, string $ctxRaw = '', ?string $extraSystem = null): array
    {
        $fallback = $this->pack(
            'Cuéntame un poco más qué necesitas (por ejemplo “memorias USB 32GB” o “cables USB-C”) y te muestro opciones del catálogo. También puedes abrir la búsqueda.',
            $this->defaultLinks(),
            [],
            'fallback'
        );

        if (! $this->iaApi->enabled()) {
            return $fallback;
        }

        $system = 'Eres un asistente amable de la tienda mexicana "Todo para oficina". '
            .'Responde en español natural y breve (máximo 2 frases). '
            .'No inventes productos, precios ni stock. '
            .'Si el pedido es ambiguo, pregunta con naturalidad (memorias USB, cables, hubs…). '
            .'Si el usuario corrige (“me refería a cables”), reconoce el cambio. '
            .'Si pregunta por “gigas/capacidad”, asume almacenamiento (GB/TB), no velocidad Gbps. '
            .'Invita a precisar para mostrar resultados reales del catálogo. Sin markdown.';

        if ($extraSystem) {
            $system .= ' '.$extraSystem;
        }

        $prompt = $ctxRaw !== ''
            ? "Historial reciente del chat:\n{$ctxRaw}\n\nMensaje actual del cliente: {$raw}"
            : $raw;

        $ia = $this->iaApi->chat([
            'system' => $system,
            'prompt' => $prompt,
        ]);

        if (! ($ia['success'] ?? false)) {
            return $fallback;
        }

        $content = trim((string) data_get($ia, 'data.message.content', ''));
        if ($content === '') {
            return $fallback;
        }

        return $this->pack($content, $this->defaultLinks(), [], 'ia_fallback');
    }

    /**
     * @param  array<int, array{label: string, href: string}>  $links
     * @param  array<int, array<string, mixed>>  $products
     * @return array{reply: string, links: array<int, array{label: string, href: string}>, products: array<int, array<string, mixed>>, intent: string}
     */
    private function pack(string $reply, array $links, array $products, string $intent): array
    {
        return [
            'reply' => $reply,
            'links' => $links,
            'products' => $products,
            'intent' => $intent,
        ];
    }

    /**
     * @return array<int, array{label: string, href: string}>
     */
    private function defaultLinks(): array
    {
        return [
            ['label' => 'Inicio', 'href' => '/'],
            ['label' => 'Búsqueda', 'href' => '/tienda/busqueda'],
            ['label' => 'Carrito', 'href' => '/tienda/carrito'],
            ['label' => 'Favoritos', 'href' => '/favoritos'],
        ];
    }

    private function normalize(string $text): string
    {
        $t = Str::lower(Str::ascii($text));
        $t = preg_replace('/[^\p{L}\p{N}\s]/u', ' ', $t) ?? $t;

        return trim(preg_replace('/\s+/', ' ', $t) ?? $t);
    }

    /**
     * @return array<int, string>
     */
    private function significantTokens(string $query): array
    {
        $norm = $this->normalize($query);
        $stop = [
            'un', 'una', 'unos', 'unas', 'el', 'la', 'los', 'las', 'de', 'del', 'para', 'por', 'con', 'sin',
            'y', 'o', 'en', 'a', 'al', 'mi', 'tu', 'su', 'que', 'me', 'te', 'se', 'lo', 'le', 'mas', 'muy',
            'busco', 'busca', 'buscar', 'necesito', 'quiero',
        ];
        $parts = preg_split('/\s+/', $norm) ?: [];
        $out = [];
        foreach ($parts as $p) {
            if ($p === '' || in_array($p, $stop, true) || mb_strlen($p) < 2) {
                continue;
            }
            $out[] = $p;
        }

        return array_values(array_unique($out));
    }

    /**
     * @param  array<int, string>  $needles
     */
    private function matchesAny(string $haystack, array $needles): bool
    {
        foreach ($needles as $n) {
            $n = $this->normalize($n);
            if ($n !== '' && str_contains($haystack, $n)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  array<int, string>  $needles
     */
    private function matchesWhole(string $haystack, array $needles): bool
    {
        foreach ($needles as $n) {
            $n = $this->normalize($n);
            if ($n === '') {
                continue;
            }
            if ($haystack === $n) {
                return true;
            }
            if (preg_match('/(?:^|\s)'.preg_quote($n, '/').'(?:\s|$)/u', $haystack) === 1) {
                return true;
            }
        }

        return false;
    }
}
