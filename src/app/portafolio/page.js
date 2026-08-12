'use client'

import { motion, useReducedMotion } from 'framer-motion'
import PortafolioNav from '@/components/portafolio/PortafolioNav'
import SitePreview from '@/components/portafolio/SitePreview'
import ShotCarousel from '@/components/portafolio/ShotCarousel'
import ContactChooser from '@/components/portafolio/ContactChooser'
import { FadeUp, Stagger, StaggerItem } from '@/components/portafolio/Motion'

const LIVES_VENTAS_SHOTS = [0, 1, 2, 3, 4, 5, 6].map(n => ({
    src: `/Imagenes/LivesVentas/image-${n}.png`,
    alt: `Lives Ventas — captura ${n + 1}`,
}))

const EMAIL = 'lufedurogi@gmail.com'
const PHONE_DISPLAY = '33 2214 7524'
const PHONE_TEL = '+523322147524'
const WHATSAPP = 'https://wa.me/523322147524'

const WORKS = [
    {
        code: '01',
        year: '2026',
        title: 'Viku',
        client: 'Asociación con nxt.it',
        role: 'Full-stack · Producto',
        stack: 'Next.js · Laravel · SQL · IA Google',
        blurb: 'Red social para coleccionistas: autenticación, comunidad, tienda, escaneo y panel administrativo.',
        href: 'https://viku.com.mx',
        previewLabel: 'En vivo',
    },
    {
        code: '02',
        year: '2025',
        title: 'Todo para oficina',
        client: 'nxt.it',
        role: 'E-commerce · Catálogo',
        stack: 'Laravel · API · SPA · IA Ollama',
        blurb: 'Tienda en línea para material de oficina: catálogo, carrito, cotizaciones, pedidos y administración.',
        href: 'https://todoparaoficna.shop/',
        previewLabel: 'Cliente',
    },
    {
        code: '03',
        year: '2025',
        title: 'Lives Ventas',
        client: 'Producto propio',
        role: 'Desktop · Ventas',
        stack: 'React · Electron · Node.js · MongoDB',
        blurb:
            'App de escritorio para vender en directo: catálogo y pedidos, notas, calendario, perfil, ajustes y chatbot ligado a lives de Facebook con respuestas configurables.',
        href: null,
        previewLabel: 'Capturas',
        shots: LIVES_VENTAS_SHOTS,
    },
]

const SERVICES = [
    {
        n: '01',
        title: 'Productos web',
        text: 'Aplicaciones con interfaz clara, rendimiento medible y arquitectura mantenible.',
    },
    {
        n: '02',
        title: 'E-commerce y catálogos',
        text: 'Tiendas, cotizaciones, pedidos y paneles operativos adaptados al negocio real.',
    },
    {
        n: '03',
        title: 'APIs y backends',
        text: 'Servicios REST sólidos, autenticación, dominio de negocio y datos confiables.',
    },
    {
        n: '04',
        title: 'UI de producto',
        text: 'Interfaces sobrias, tipografía precisa y microinteracciones que no distraen.',
    },
]

const PRINCIPLES = [
    {
        k: 'Claridad',
        v: 'Cada pantalla tiene un trabajo. Sin ruido visual ni complejidad ornamental.',
    },
    {
        k: 'Estructura',
        v: 'Grid, tipografía y jerarquía como en sistemas corporativos clásicos.',
    },
    {
        k: 'Flexibilidad',
        v: 'Me adapto al presupuesto y al alcance: entregas priorizadas, sin sobreingeniería.',
    },
    {
        k: 'Señal',
        v: 'Un acento, un ritmo. El detalle importa cuando el resto se mantiene limpio.',
    },
]

const PROCESS = [
    {
        n: '01',
        title: 'Escucha',
        text: 'Entiendo el problema, el público y lo que sí (y no) cabe en el presupuesto.',
    },
    {
        n: '02',
        title: 'Diseño',
        text: 'Definimos alcance, flujos y una interfaz clara antes de escribir de más.',
    },
    {
        n: '03',
        title: 'Construcción',
        text: 'Itero en entregables visibles: puedes ver avance real, no solo promesas.',
    },
    {
        n: '04',
        title: 'Entrega',
        text: 'Despliegue, documentación breve y ajustes para que el sistema quede operable.',
    },
]

export default function PortafolioPage() {
    const reduce = useReducedMotion()

    return (
        <div className="relative overflow-x-hidden">
            <PortafolioNav />

            {/* —— HERO —— */}
            <section
                id="inicio"
                className="relative flex min-h-[100svh] flex-col justify-end pb-16 pt-28 sm:pb-20 sm:pt-32">
                <div
                    className="pf-grid-plane pf-grid-drift pointer-events-none absolute inset-0"
                    aria-hidden
                />
                <div
                    className="pf-hero-glow pointer-events-none absolute inset-0"
                    aria-hidden
                />
                <div
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[var(--pf-bg)] to-transparent"
                    aria-hidden
                />

                <div
                    className="pointer-events-none absolute inset-x-0 top-[18%] h-[52%] sm:top-[14%] sm:h-[58%]"
                    aria-hidden>
                    <motion.div
                        className="pf-encom-plane absolute inset-0 origin-bottom"
                        style={{
                            transform: 'perspective(900px) rotateX(58deg) scale(1.35)',
                            transformOrigin: '50% 100%',
                        }}
                        animate={
                            reduce
                                ? undefined
                                : { opacity: [0.45, 0.7, 0.45] }
                        }
                        transition={{
                            duration: 10,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                    />
                    <div className="absolute left-1/2 top-[42%] h-px w-[min(72%,520px)] -translate-x-1/2 bg-[var(--pf-signal)]/40" />
                </div>

                <div className="relative z-10 mx-auto w-full max-w-6xl px-5 sm:px-8">
                    <FadeUp>
                        <p className="pf-mono mb-6 flex items-center gap-3 pf-type-label uppercase tracking-[0.28em] text-[var(--pf-mute)]">
                            <span className="inline-block h-px w-8 bg-[var(--pf-signal)]" />
                            Ingeniero de software · Guadalajara, MX
                        </p>
                    </FadeUp>

                    <FadeUp delay={0.08}>
                        <h1 className="max-w-5xl text-[clamp(2.75rem,11vw,6.75rem)] font-light leading-[0.92] tracking-[-0.04em] text-[var(--pf-ink)]">
                            <span className="block">FERNANDO</span>
                            <span className="mt-1 block text-[var(--pf-mute)]">
                                DURÁN
                            </span>
                        </h1>
                    </FadeUp>

                    <FadeUp delay={0.16}>
                        <p className="mt-6 max-w-lg text-base font-light leading-relaxed text-[var(--pf-mute)] sm:text-lg">
                            Diseño y construyo productos digitales — e-commerce,
                            redes y sistemas a medida — con disciplina tipográfica
                            y alcance ajustado a tu presupuesto.
                        </p>
                    </FadeUp>

                    <FadeUp
                        delay={0.24}
                        className="mt-10 flex flex-wrap items-center gap-4">
                        <a
                            href="#trabajo"
                            className="pf-cta inline-flex items-center justify-center border border-[var(--pf-ink)] bg-[var(--pf-ink)] px-6 py-3 pf-type-ui font-medium uppercase tracking-[0.2em] text-[var(--pf-bg)] transition-opacity hover:opacity-90">
                            Ver trabajo
                        </a>
                        <ContactChooser />
                    </FadeUp>
                </div>
            </section>

            {/* —— META BAR —— */}
            <div className="border-y border-[var(--pf-line)]">
                <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px sm:grid-cols-4">
                    {[
                        ['Estado', 'Disponible'],
                        ['Presupuesto', 'Flexible'],
                        ['Base', 'Guadalajara'],
                        [
                            'Stack',
                            'C++ · Java · JS · PHP · Python · SQL · MySQL · MongoDB · HTML · CSS',
                        ],
                    ].map(([k, v], i) => (
                        <FadeUp
                            key={k}
                            delay={i * 0.05}
                            className="flex flex-col gap-1 px-5 py-5 sm:px-8">
                            <span className="pf-mono pf-type-meta uppercase tracking-[0.22em] text-[var(--pf-mute)]">
                                {k}
                            </span>
                            <span className="text-base font-light text-[var(--pf-ink)]">
                                {v}
                            </span>
                        </FadeUp>
                    ))}
                </div>
            </div>

            {/* —— TRABAJO —— */}
            <section
                id="trabajo"
                className="mx-auto max-w-6xl px-5 py-24 sm:px-8 sm:py-32">
                <FadeUp className="mb-14 flex flex-col gap-3 sm:mb-16 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="pf-mono mb-3 pf-type-label uppercase tracking-[0.28em] text-[var(--pf-signal)]">
                            01 — Selección
                        </p>
                        <h2 className="text-3xl font-light tracking-[-0.03em] text-[var(--pf-ink)] sm:text-4xl">
                            Trabajo reciente
                        </h2>
                    </div>
                    <p className="max-w-xs text-base font-light leading-relaxed text-[var(--pf-mute)]">
                        Proyectos en producción: preview en vivo donde hay sitio,
                        capturas cuando el producto es de escritorio.
                    </p>
                </FadeUp>

                <Stagger>
                    {WORKS.map((work, index) => (
                        <StaggerItem key={work.code} as={motion.article}>
                            <article className="pf-work-row group py-8 sm:py-10">
                                <div className="grid gap-4 sm:grid-cols-[4.5rem_1fr_auto] sm:items-baseline sm:gap-8">
                                    <span className="pf-mono pf-type-ui tracking-[0.12em] text-[var(--pf-mute)]">
                                        {work.code}
                                    </span>
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                                            {work.href ? (
                                                <a
                                                    href={work.href}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xl font-light tracking-[-0.02em] text-[var(--pf-ink)] transition-colors hover:text-[var(--pf-signal)] sm:text-2xl">
                                                    {work.title}
                                                </a>
                                            ) : (
                                                <h3 className="text-xl font-light tracking-[-0.02em] text-[var(--pf-ink)] sm:text-2xl">
                                                    {work.title}
                                                </h3>
                                            )}
                                            <span className="pf-mono pf-type-label uppercase tracking-[0.16em] text-[var(--pf-mute)]">
                                                {work.year}
                                            </span>
                                        </div>
                                        <p className="pf-mono mt-1 pf-type-label uppercase tracking-[0.14em] text-[var(--pf-signal)]/80">
                                            {work.client}
                                        </p>
                                        <p className="mt-2 max-w-xl text-base font-light leading-relaxed text-[var(--pf-mute)]">
                                            {work.blurb}
                                        </p>
                                        <p className="pf-mono mt-3 pf-type-label uppercase tracking-[0.14em] text-[var(--pf-mute)]/80">
                                            {work.stack}
                                        </p>
                                    </div>
                                    <span className="pf-mono self-start pf-type-label uppercase tracking-[0.16em] text-[var(--pf-mute)] sm:pt-1">
                                        {work.role}
                                    </span>
                                </div>

                                {work.href || work.shots?.length ? (
                                    <div className="sm:pl-[4.5rem] sm:pr-0 lg:max-w-3xl">
                                        {work.shots?.length ? (
                                            <ShotCarousel
                                                shots={work.shots}
                                                title={work.title}
                                                label={work.previewLabel}
                                                loading={
                                                    index === 0 ? 'eager' : 'lazy'
                                                }
                                            />
                                        ) : (
                                            <SitePreview
                                                url={work.href}
                                                title={work.title}
                                                label={work.previewLabel}
                                                loading={
                                                    index === 0 ? 'eager' : 'lazy'
                                                }
                                            />
                                        )}
                                    </div>
                                ) : null}
                            </article>
                        </StaggerItem>
                    ))}
                </Stagger>
            </section>

            {/* —— SERVICIOS —— */}
            <section
                id="servicios"
                className="border-t border-[var(--pf-line)] bg-[var(--pf-bg-elev)]">
                <div className="mx-auto max-w-6xl px-5 py-24 sm:px-8 sm:py-32">
                    <FadeUp className="mb-6 sm:mb-8">
                        <p className="pf-mono mb-3 pf-type-label uppercase tracking-[0.28em] text-[var(--pf-signal)]">
                            02 — Servicios
                        </p>
                        <h2 className="max-w-lg text-3xl font-light tracking-[-0.03em] text-[var(--pf-ink)] sm:text-4xl">
                            Qué puedo construir contigo
                        </h2>
                    </FadeUp>
                    <FadeUp delay={0.06} className="mb-14 max-w-xl sm:mb-16">
                        <p className="text-base font-light leading-relaxed text-[var(--pf-mute)]">
                            Trabajo por fases y priorizo lo que más valor aporta.
                            El alcance se calibra a tu presupuesto — sin perder
                            calidad en lo esencial.
                        </p>
                    </FadeUp>

                    <div className="grid gap-px sm:grid-cols-2">
                        {SERVICES.map((s, i) => (
                            <FadeUp key={s.n} delay={i * 0.06}>
                                <div className="pf-service-item h-full px-5 py-8 sm:px-7 sm:py-10">
                                    <span className="pf-mono pf-type-label tracking-[0.2em] text-[var(--pf-mute)]">
                                        {s.n}
                                    </span>
                                    <h3 className="mt-4 text-lg font-light tracking-[-0.02em] text-[var(--pf-ink)]">
                                        {s.title}
                                    </h3>
                                    <p className="mt-3 max-w-sm text-base font-light leading-relaxed text-[var(--pf-mute)]">
                                        {s.text}
                                    </p>
                                </div>
                            </FadeUp>
                        ))}
                    </div>
                </div>
            </section>

            {/* —— PROCESO —— */}
            <section
                id="proceso"
                className="border-t border-[var(--pf-line)]">
                <div className="mx-auto max-w-6xl px-5 py-24 sm:px-8 sm:py-28">
                    <FadeUp className="mb-14 sm:mb-16">
                        <p className="pf-mono mb-3 pf-type-label uppercase tracking-[0.28em] text-[var(--pf-signal)]">
                            03 — Proceso
                        </p>
                        <h2 className="text-3xl font-light tracking-[-0.03em] text-[var(--pf-ink)] sm:text-4xl">
                            Cómo suelo trabajar
                        </h2>
                    </FadeUp>

                    <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-4">
                        {PROCESS.map((step, i) => (
                            <FadeUp key={step.n} delay={i * 0.07}>
                                <div
                                    className={`h-full border-[var(--pf-line)] py-6 pr-6 sm:py-0 sm:pr-8 ${
                                        i < PROCESS.length - 1
                                            ? 'sm:border-r'
                                            : ''
                                    } ${i > 0 ? 'border-t sm:border-t-0' : ''}`}>
                                    <span className="pf-mono pf-type-label tracking-[0.2em] text-[var(--pf-mute)]">
                                        {step.n}
                                    </span>
                                    <h3 className="mt-4 text-base font-light tracking-[-0.02em] text-[var(--pf-ink)]">
                                        {step.title}
                                    </h3>
                                    <p className="mt-3 text-base font-light leading-relaxed text-[var(--pf-mute)]">
                                        {step.text}
                                    </p>
                                </div>
                            </FadeUp>
                        ))}
                    </div>
                </div>
            </section>

            {/* —— ENFOQUE —— */}
            <section
                id="enfoque"
                className="border-t border-[var(--pf-line)] bg-[var(--pf-bg-elev)]">
                <div className="mx-auto max-w-6xl px-5 py-24 sm:px-8 sm:py-32">
                    <div className="grid gap-14 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
                        <FadeUp>
                            <p className="pf-mono mb-3 pf-type-label uppercase tracking-[0.28em] text-[var(--pf-signal)]">
                                04 — Enfoque
                            </p>
                            <h2 className="text-3xl font-light tracking-[-0.03em] text-[var(--pf-ink)] sm:text-4xl">
                                Minimalismo con memoria
                            </h2>
                            <p className="mt-6 text-base font-light leading-relaxed text-[var(--pf-mute)] sm:text-lg">
                                Busco silencio visual, tipografía precisa y
                                geometría con intención: no como ornamento, sino
                                como disciplina. Menos capas. Más claridad.
                            </p>
                        </FadeUp>

                        <Stagger className="flex flex-col" delay={0.1}>
                            {PRINCIPLES.map((p, i) => (
                                <StaggerItem key={p.k}>
                                    <div
                                        className={`flex gap-6 py-6 sm:gap-10 ${
                                            i < PRINCIPLES.length - 1
                                                ? 'border-b border-[var(--pf-line)]'
                                                : ''
                                        }`}>
                                        <span className="pf-mono w-8 shrink-0 pt-1 pf-type-label tracking-[0.16em] text-[var(--pf-mute)]">
                                            {String(i + 1).padStart(2, '0')}
                                        </span>
                                        <div>
                                            <h3 className="text-base font-medium tracking-[-0.01em] text-[var(--pf-ink)]">
                                                {p.k}
                                            </h3>
                                            <p className="mt-2 text-base font-light leading-relaxed text-[var(--pf-mute)]">
                                                {p.v}
                                            </p>
                                        </div>
                                    </div>
                                </StaggerItem>
                            ))}
                        </Stagger>
                    </div>
                </div>
            </section>

            {/* —— CONTACTO —— */}
            <section
                id="contacto"
                className="relative overflow-hidden border-t border-[var(--pf-line)]">
                <div
                    className="pf-scanline pointer-events-none absolute inset-0 opacity-40"
                    aria-hidden
                />
                <div className="relative mx-auto max-w-6xl px-5 py-24 sm:px-8 sm:py-32">
                    <FadeUp>
                        <p className="pf-mono mb-3 pf-type-label uppercase tracking-[0.28em] text-[var(--pf-signal)]">
                            05 — Contacto
                        </p>
                        <h2 className="max-w-2xl text-[clamp(2rem,6vw,3.5rem)] font-light leading-[1.05] tracking-[-0.03em] text-[var(--pf-ink)]">
                            Cuéntame qué necesitas. Ajustamos alcance y
                            presupuesto juntos.
                        </h2>
                    </FadeUp>

                    <FadeUp
                        delay={0.1}
                        className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                            <p className="pf-mono mb-2 pf-type-meta uppercase tracking-[0.22em] text-[var(--pf-mute)]">
                                Correo
                            </p>
                            <a
                                href={`mailto:${EMAIL}`}
                                className="text-base font-light text-[var(--pf-ink)] transition-colors hover:text-[var(--pf-signal)] break-all">
                                {EMAIL}
                            </a>
                        </div>
                        <div>
                            <p className="pf-mono mb-2 pf-type-meta uppercase tracking-[0.22em] text-[var(--pf-mute)]">
                                Celular / WhatsApp
                            </p>
                            <a
                                href={`tel:${PHONE_TEL}`}
                                className="block text-base font-light text-[var(--pf-ink)] transition-colors hover:text-[var(--pf-signal)]">
                                {PHONE_DISPLAY}
                            </a>
                            <a
                                href={WHATSAPP}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="pf-mono mt-1 inline-block pf-type-label uppercase tracking-[0.14em] text-[var(--pf-mute)] transition-colors hover:text-[var(--pf-signal)]">
                                Abrir WhatsApp ↗
                            </a>
                        </div>
                        <div>
                            <p className="pf-mono mb-2 pf-type-meta uppercase tracking-[0.22em] text-[var(--pf-mute)]">
                                Ubicación
                            </p>
                            <p className="text-base font-light text-[var(--pf-ink)]">
                                Guadalajara, Jalisco
                            </p>
                            <p className="mt-1 text-base font-light text-[var(--pf-mute)]">
                                Proyectos remotos o locales
                            </p>
                        </div>
                    </FadeUp>

                    <FadeUp
                        delay={0.16}
                        className="mt-12 flex flex-wrap items-center gap-4">
                        <a
                            href={`mailto:${EMAIL}?subject=Proyecto%20/%20consulta`}
                            className="pf-cta inline-flex items-center border border-[var(--pf-signal)] bg-[var(--pf-signal)]/10 px-6 py-3.5 pf-type-ui font-medium uppercase tracking-[0.2em] text-[var(--pf-signal)] transition-colors hover:bg-[var(--pf-signal)] hover:text-[var(--pf-bg)]">
                            Escribir correo
                        </a>
                        <a
                            href={WHATSAPP}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="pf-mono inline-flex items-center border border-[var(--pf-line-strong)] px-6 py-3.5 pf-type-ui uppercase tracking-[0.2em] text-[var(--pf-ink)] transition-colors hover:border-[var(--pf-signal)] hover:text-[var(--pf-signal)]">
                            WhatsApp
                        </a>
                        <p className="pf-mono pf-type-label uppercase tracking-[0.18em] text-[var(--pf-mute)]">
                            Respuesta habitual · 24–48 h
                        </p>
                    </FadeUp>
                </div>
            </section>

            <footer className="border-t border-[var(--pf-line)]">
                <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                    <p className="pf-mono pf-type-label uppercase tracking-[0.2em] text-[var(--pf-mute)]">
                        © {new Date().getFullYear()} Fernando Durán
                    </p>
                    <div className="flex flex-wrap gap-5">
                        <a
                            href="https://viku.com.mx"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="pf-mono pf-type-label uppercase tracking-[0.16em] text-[var(--pf-mute)] transition-colors hover:text-[var(--pf-signal)]">
                            Viku
                        </a>
                        <a
                            href="https://todoparaoficna.shop/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="pf-mono pf-type-label uppercase tracking-[0.16em] text-[var(--pf-mute)] transition-colors hover:text-[var(--pf-signal)]">
                            Todo para oficina
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    )
}
