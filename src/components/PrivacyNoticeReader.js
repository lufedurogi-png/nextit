'use client'

import Image from 'next/image'
import Link from 'next/link'
import BrandLogo from '@/components/BrandLogo'
import { useState, useMemo } from 'react'

function ExternalSocialButton({ href, label, img, rounded, darkMode }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={`group flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition-all hover:border-[#2563eb] hover:shadow-lg ${
                darkMode ? 'border-gray-600 bg-gray-800/80' : 'border-gray-200 bg-white'
            }`}
        >
            <span
                className={`flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden bg-white ${
                    rounded ? 'rounded-xl' : 'rounded-full'
                }`}
            >
                <Image
                    src={img}
                    alt=""
                    width={48}
                    height={48}
                    className={`max-h-12 max-w-12 object-contain ${rounded ? 'rounded-xl' : 'rounded-full'}`}
                />
            </span>
            <span className="text-xs font-semibold text-center group-hover:text-[#2563eb]">{label}</span>
        </a>
    )
}

const SOCIAL = [
    { href: 'https://www.facebook.com/profile.php?id=61581113920975', label: 'Facebook', img: '/Imagenes/icon_Facebook.webp', rounded: true },
    { href: 'https://www.instagram.com/nxtit_desarrollo/', label: 'Instagram', img: '/Imagenes/icon_Instagram.png', rounded: true },
    { href: 'https://x.com/NxtitDesarrollo', label: 'X (Twitter)', img: '/Imagenes/icon_Twitter.png', rounded: true },
]

function PageIntro({ darkMode }) {
    return (
        <div className={`space-y-3 text-sm leading-relaxed ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
            <p className="font-semibold text-[#2563eb]">AVISO DE PRIVACIDAD INTEGRAL</p>
            <p>
                Nxt.it (Arrcuss Comercial de S de RL de CV), con domicilio en Lopez Mateos #1038 Int:10, Colonia Italia
                Providencia, Ciudad Guadalajara, Municipio o Delegación Guadalajara, C.P. 44630, en la entidad de Mexico, país
                México, y portal de internet www.todoparaoficna.com.mx, es el responsable del uso y protección de sus datos
                personales, y al respecto le informamos lo siguiente:
            </p>
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Plaza Florencia, Av Adolfo López Mateos Nte 1038, Providencia, 44630 Guadalajara, Jal. · www.nxt.it.com
            </p>
        </div>
    )
}

function PageFines({ darkMode }) {
    return (
        <div className={`space-y-3 text-sm leading-relaxed ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
            <p className="font-semibold text-[#2563eb]">¿Para qué fines utilizaremos sus datos personales?</p>
            <p>Los datos personales que recabamos de usted, los utilizaremos para las siguientes finalidades que son necesarias para el servicio que solicita:</p>
            <p className="font-medium">Finalidades primarias</p>
            <ul className="list-disc pl-5 space-y-1">
                <li>Verificar y confirmar su identidad.</li>
                <li>Procesar sus pedidos y compras en nuestra tienda en línea.</li>
                <li>Realizar la facturación y cobro.</li>
                <li>Realizar el envío y entrega de los productos adquiridos.</li>
                <li>Proveer los servicios y productos requeridos por usted.</li>
            </ul>
            <p className="font-medium">Finalidades secundarias</p>
            <ul className="list-disc pl-5 space-y-1">
                <li>Mercadotecnia o publicitaria.</li>
                <li>Prospección comercial.</li>
            </ul>
        </div>
    )
}

function PageDatos({ darkMode }) {
    return (
        <div className={`space-y-3 text-sm leading-relaxed ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
            <p className="font-semibold text-[#2563eb]">¿Qué datos personales utilizaremos para estos fines?</p>
            <p>Para llevar a cabo las finalidades descritas en el presente aviso de privacidad, utilizaremos los siguientes datos personales:</p>
            <ul className="list-disc pl-5 space-y-1">
                <li>Datos de identificación (Nombre completo).</li>
                <li>Datos de contacto (Teléfono, Correo electrónico, Domicilio de envío).</li>
                <li>Datos fiscales (RFC, Domicilio fiscal) para facturación.</li>
            </ul>
            <p className={`text-sm ${darkMode ? 'text-amber-200/90' : 'text-amber-900'}`}><strong>Nota:</strong> No recabamos datos personales sensibles.</p>
        </div>
    )
}

function PageArco({ darkMode }) {
    return (
        <div className={`space-y-3 text-sm leading-relaxed ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
            <p className="font-semibold text-[#2563eb]">¿Cómo puede acceder, rectificar o cancelar sus datos personales, u oponerse a su uso? (Derechos ARCO)</p>
            <p>
                Usted tiene derecho a conocer qué datos personales tenemos de usted, para qué los utilizamos y las condiciones del uso que les damos (Acceso).
                Asimismo, es su derecho solicitar la corrección de su información personal en caso de que esté desactualizada, sea inexacta o incompleta (Rectificación);
                que la eliminemos de nuestros registros o bases de datos cuando considere que la misma no está siendo utilizada adecuadamente (Cancelación); así como
                oponerse al uso de sus datos personales para fines específicos (Oposición). Estos derechos se conocen como derechos ARCO.
            </p>
            <p>Para el ejercicio de cualquiera de los derechos ARCO, usted deberá presentar la solicitud respectiva a través del siguiente medio:</p>
            <ul className="list-disc pl-5">
                <li>Enviando un correo electrónico a: <a className="text-[#2563eb] hover:underline font-medium" href="mailto:desarrollo@nxt.it.com">desarrollo@nxt.it.com</a></li>
            </ul>
        </div>
    )
}

function PageCookies({ darkMode }) {
    return (
        <div className={`space-y-3 text-sm leading-relaxed ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
            <p className="font-semibold text-[#2563eb]">Uso de tecnologías de rastreo (Cookies)</p>
            <p>
                Le informamos que en nuestra página de internet utilizamos cookies, web beacons u otras tecnologías, a través de las cuales es posible monitorear
                su comportamiento como usuario de internet, así como brindarle un mejor servicio y experiencia al navegar en nuestra página.
            </p>
        </div>
    )
}

function PageCambios({ darkMode }) {
    return (
        <div className={`space-y-3 text-sm leading-relaxed ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
            <p className="font-semibold text-[#2563eb]">Cambios al Aviso de Privacidad</p>
            <p>
                El presente aviso de privacidad puede sufrir modificaciones, cambios o actualizaciones derivadas de nuevos requerimientos legales; de nuestras propias
                necesidades por los productos o servicios que ofrecemos; de nuestras prácticas de privacidad; o por otras causas. Nos comprometemos a mantenerlo
                informado sobre los cambios que pueda sufrir el presente aviso de privacidad.
            </p>
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Última actualización: Diciembre 5 de 2025</p>
        </div>
    )
}

function PageContacto({ darkMode }) {
    return (
        <div className={`space-y-3 text-sm leading-relaxed ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
            <p className="font-semibold text-[#2563eb]">Datos de contacto</p>
            <ul className="space-y-2">
                <li><span className="font-medium">Dirección completa:</span> Av. Lopez Mateos #1038-11, Col Italia Providencia CP 44630</li>
                <li><span className="font-medium">Correo:</span> desarrollo@nxt.it.com</li>
                <li><span className="font-medium">Correo (adicional):</span> joseluis@nxt.it.com</li>
                <li><span className="font-medium">Teléfono:</span> 333 616-7279</li>
                <li><span className="font-medium">Estado:</span> Jalisco</li>
                <li><span className="font-medium">Ciudad:</span> Guadalajara</li>
            </ul>
        </div>
    )
}

function PageRedes({ darkMode }) {
    return (
        <div className={`space-y-4 text-sm leading-relaxed ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
            <p className="font-semibold text-[#2563eb]">Redes sociales</p>
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Elige una red para abrir el enlace oficial.</p>
            <div className="flex flex-wrap gap-4 justify-center sm:justify-start">
                {SOCIAL.map((s) => (
                    <ExternalSocialButton key={s.href} href={s.href} label={s.label} img={s.img} rounded={s.rounded} darkMode={darkMode} />
                ))}
            </div>
        </div>
    )
}

const PAGES_META = [
    { title: 'Aviso integral', render: PageIntro },
    { title: 'Fines', render: PageFines },
    { title: 'Datos personales', render: PageDatos },
    { title: 'Derechos ARCO', render: PageArco },
    { title: 'Cookies', render: PageCookies },
    { title: 'Cambios', render: PageCambios },
    { title: 'Contacto', render: PageContacto },
    { title: 'Redes sociales', render: PageRedes },
]

/**
 * Lector tipo “libro” del aviso de privacidad (paginado con flechas).
 */
export default function PrivacyNoticeReader({ darkMode, showLogo = true, className = '' }) {
    const [idx, setIdx] = useState(0)
    const total = PAGES_META.length
    const Page = PAGES_META[idx].render

    const canPrev = idx > 0
    const canNext = idx < total - 1

    const bar = useMemo(
        () => (
            <div className={`flex items-center justify-between gap-3 border-b pb-3 mb-4 ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                {showLogo ? (
                    <Link href="/" className="shrink-0">
                        <BrandLogo dark={darkMode} className="h-10 max-w-[200px]" />
                    </Link>
                ) : (
                    <span />
                )}
                <span className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {idx + 1} / {total} · {PAGES_META[idx].title}
                </span>
            </div>
        ),
        [darkMode, idx, showLogo, total]
    )

    return (
        <div className={`${className}`}>
            {bar}
            <div className="min-h-[220px] max-h-[min(55vh,420px)] overflow-y-auto pr-1">
                <Page darkMode={darkMode} />
            </div>
            <div className={`flex items-center justify-between gap-3 mt-4 pt-3 border-t ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                <button
                    type="button"
                    disabled={!canPrev}
                    onClick={() => canPrev && setIdx((i) => i - 1)}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-40 ${
                        darkMode ? 'bg-gray-700 text-gray-100 hover:bg-gray-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                    }`}
                >
                    ← Anterior
                </button>
                <button
                    type="button"
                    disabled={!canNext}
                    onClick={() => canNext && setIdx((i) => i + 1)}
                    className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-40 bg-gradient-to-r from-[#0b1b3c] to-[#2563eb] hover:from-[#132e5c] hover:to-[#1d4ed8] shadow-sm"
                >
                    Siguiente →
                </button>
            </div>
        </div>
    )
}

export function PrivacyNoticeModal({ darkMode, open, onClose }) {
    if (!open) return null
    return (
        <>
            <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm" aria-hidden onClick={onClose} />
            <div
                className={`fixed left-1/2 top-1/2 z-[110] w-[min(100vw-1.5rem,520px)] max-h-[min(92vh,640px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl shadow-2xl border ${
                    darkMode ? 'bg-gray-900 border-gray-700 text-gray-100' : 'bg-white border-gray-200 text-gray-900'
                }`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="privacy-modal-title"
            >
                <div className={`flex items-center justify-between px-4 py-3 border-b ${darkMode ? 'border-gray-700 bg-gray-800/80' : 'border-gray-200 bg-gray-50'}`}>
                    <h2 id="privacy-modal-title" className="text-lg font-bold">
                        Aviso de privacidad
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Cerrar"
                        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg p-1 transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-red-500/40"
                    >
                        <Image
                            src="/Imagenes/icon_cerrar.png"
                            alt=""
                            width={28}
                            height={28}
                            className="object-contain"
                            style={{
                                filter:
                                    'invert(18%) sepia(98%) saturate(5000%) hue-rotate(350deg) brightness(0.95) contrast(1.1)',
                            }}
                        />
                    </button>
                </div>
                <div className="p-4 sm:p-5 overflow-hidden">
                    <PrivacyNoticeReader darkMode={darkMode} showLogo />
                </div>
            </div>
        </>
    )
}
