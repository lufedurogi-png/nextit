'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/hooks/auth'

const Home = () => {
    const { user, logout } = useAuth({ middleware: 'guest' })
    const [userDropdownOpen, setUserDropdownOpen] = useState(false)

    // Cerrar dropdown al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (userDropdownOpen && !event.target.closest('.relative')) {
                setUserDropdownOpen(false)
            }
        }
        if (userDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [userDropdownOpen])

    const NavLink = ({ href, children }) => (
        <a href={href} className="text-white hover:text-[#FF8000] transition-colors font-medium">
            {children}
        </a>
    )

    return (
        <div className="min-h-screen text-white bg-gray-950">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-gray-950/70 backdrop-blur-sm border-b border-white/10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link href="/" className="flex items-center">
                            <Image
                                src="/Imagenes/logo_nxtIt.png"
                                alt="NXT.IT"
                                width={120}
                                height={40}
                                className="h-8 w-auto"
                            />
                        </Link>

                        <div className="flex items-center gap-6">
                            <div className="hidden md:flex items-center gap-6">
                                <NavLink href="/tienda">Tienda</NavLink>
                                <NavLink href="#nosotros">Nosotros</NavLink>
                                <NavLink href="#contacto">Contacto</NavLink>
                            </div>

                            {user ? (
                                <div className="relative">
                                    <button
                                        onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                                        className="flex items-center space-x-2 text-white hover:text-[#FF8000] transition-colors font-medium"
                                    >
                                        <span>{user?.name || user?.email}</span>
                                        <svg
                                            className={`w-4 h-4 transition-transform duration-200 ${userDropdownOpen ? 'rotate-180' : ''}`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>

                                    {userDropdownOpen && (
                                        <>
                                            <div className="fixed inset-0 z-10" onClick={() => setUserDropdownOpen(false)} />
                                            <div className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg border z-20 bg-white border-gray-200">
                                                <div className="py-1">
                                                    <Link
                                                        href="/dashboard"
                                                        onClick={() => setUserDropdownOpen(false)}
                                                        className="flex items-center px-4 py-2 text-sm transition-colors text-gray-700 hover:bg-gray-100 hover:text-[#FF8000]"
                                                    >
                                                        Home
                                                    </Link>
                                                    <Link
                                                        href="/dashboard"
                                                        onClick={() => setUserDropdownOpen(false)}
                                                        className="flex items-center px-4 py-2 text-sm transition-colors text-gray-700 hover:bg-gray-100 hover:text-[#FF8000]"
                                                    >
                                                        Mis pedidos
                                                    </Link>
                                                    <Link
                                                        href="/favoritos"
                                                        onClick={() => setUserDropdownOpen(false)}
                                                        className="flex items-center px-4 py-2 text-sm transition-colors text-gray-700 hover:bg-gray-100 hover:text-[#FF8000]"
                                                    >
                                                        Favoritos
                                                    </Link>
                                                    <button
                                                        onClick={() => {
                                                            setUserDropdownOpen(false)
                                                            logout()
                                                        }}
                                                        className="w-full flex items-center px-4 py-2 text-sm transition-colors text-gray-700 hover:bg-gray-100 hover:text-[#FF8000]"
                                                    >
                                                        Cerrar
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center gap-4">
                                    <Link href="/login" className="text-white hover:text-[#FF8000] transition-colors font-medium">
                                        Iniciar sesión
                                    </Link>
                                    <Link href="/register" className="text-white hover:text-[#FF8000] transition-colors font-medium">
                                        Registrarse
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Hero mitad y mitad */}
            <main className="pt-16">
                <section className="min-h-[calc(100vh-4rem)] flex flex-col md:flex-row">
                    <div className="md:w-1/2 bg-gray-950 p-10 flex flex-col justify-center relative overflow-hidden">
                        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_20%_20%,rgba(255,128,0,0.35),transparent_55%),radial-gradient(circle_at_80%_30%,rgba(0,176,255,0.25),transparent_50%)]" />

                        <div className="relative">
                            <Image
                                src="/Imagenes/logo_nxtIt.png"
                                alt="NXT.IT"
                                width={520}
                                height={180}
                                className="w-auto h-20 md:h-24"
                                priority
                            />

                            <h1 className="mt-6 text-4xl md:text-5xl font-extrabold leading-tight fade-up">
                                Tu Hub Integrador de Soluciones Tecnológicas
                                <span className="text-[#FF8000]">.</span>
                            </h1>

                            <p className="mt-5 text-gray-200 max-w-xl leading-relaxed">
                                Desde una PC hasta un centro de datos completo. Llevamos más de una década impulsando a empresas y gobiernos con tecnología de vanguardia.
                            </p>

                            <div className="mt-8 flex gap-4 flex-wrap">
                                <Link
                                    href="/tienda"
                                    className="px-6 py-3 rounded-xl bg-[#FF8000] hover:bg-[#e67300] text-gray-950 font-bold transition-colors"
                                >
                                    Ir a tienda
                                </Link>
                                <Link
                                    href="/tienda/cotizaciones"
                                    className="px-6 py-3 rounded-xl border border-white/20 hover:border-[#FF8000] bg-white/5 hover:bg-white/10 text-white font-bold transition-colors"
                                >
                                    Solicitar cotización
                                </Link>
                            </div>
                        </div>
                    </div>

                    <div className="md:w-1/2 bg-white text-gray-900 p-10 flex flex-col justify-center">
                        <div className="max-w-xl mx-auto w-full">
                            <p className="text-sm font-bold tracking-widest text-[#FF8000] uppercase">
                                Compromiso y experiencia
                            </p>
                            <h2 className="mt-3 text-3xl font-extrabold leading-snug">
                                Tecnología que acompaña tu operación
                            </h2>

                            <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {[
                                    { t: 'Enfoque empresarial', d: 'Soluciones pensadas para operación real' },
                                    { t: 'Tecnología de vanguardia', d: 'Actualización constante y mejores prácticas' },
                                    { t: 'Integración integral', d: 'Un flujo de trabajo claro y controlado' },
                                    { t: 'Atención cercana', d: 'Acompañamiento para decidir con confianza' },
                                ].map((x) => (
                                    <div
                                        key={x.t}
                                        className="rounded-2xl border border-gray-200 bg-white/70 p-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-[#FF8000]/40 fade-up"
                                    >
                                        <p className="font-bold">{x.t}</p>
                                        <p className="text-sm text-gray-600 mt-2">{x.d}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-7 rounded-2xl border border-gray-200 bg-gray-50 p-5 transition-all duration-300 hover:border-[#FF8000]/30">
                                <p className="text-sm text-gray-600">Contacto</p>
                                <p className="font-bold mt-1">333 616-7279</p>
                                <p className="text-sm text-gray-600 mt-1">desarrollo@nxt.it.com</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Nosotros */}
                <section id="nosotros" className="py-20 bg-gray-50 text-gray-900">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-end justify-between gap-6 flex-col md:flex-row">
                            <div>
                                <p className="text-sm font-bold tracking-widest text-[#FF8000] uppercase">Nosotros</p>
                                <h2 className="mt-3 text-4xl font-extrabold">Una empresa enfocada en soluciones que sí se usan</h2>
                            </div>
                            <div className="text-sm text-gray-600 max-w-lg">
                                Historia, misión y visión organizadas de forma clara para que la información se entienda rápido.
                            </div>
                        </div>

                        <div className="mt-10 rounded-3xl overflow-hidden border border-gray-200 bg-white transition-all duration-300 hover:shadow-lg">
                            <div className="p-6">
                                <p className="text-sm font-bold tracking-widest text-[#FF8000] uppercase">Nuestra historia</p>
                                <p className="mt-2 text-gray-600 text-sm">
                                    Tres secciones claras para entender de dónde venimos y hacia dónde vamos.
                                </p>
                            </div>
                            <div className="px-6 pb-6">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 transition-all duration-300 hover:border-[#FF8000]/30">
                                        <p className="font-extrabold text-[#FF8000] uppercase text-sm tracking-wider">Historia</p>
                                        <p className="mt-3 text-gray-700 leading-relaxed text-sm">
                                            Fundada en 2009 como Arrcuss Comercial, hoy como NXT.IT. Nació como un proyecto emprendedor para democratizar la necesidad de equipo de cómputo y electrónica para las PYMES, y con el paso del tiempo evolucionó a un hub integrador de soluciones tecnológicas.
                                        </p>
                                    </div>
                                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 transition-all duration-300 hover:border-[#FF8000]/30">
                                        <p className="font-extrabold text-[#FF8000] uppercase text-sm tracking-wider">Misión</p>
                                        <p className="mt-3 text-gray-700 leading-relaxed text-sm">
                                            Incrementar las capacidades de nuestros clientes mediante soluciones de software, hardware y tecnología de consumo, para que su operación sea más eficiente y esté lista para crecer.
                                        </p>
                                    </div>
                                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 transition-all duration-300 hover:border-[#FF8000]/30">
                                        <p className="font-extrabold text-[#FF8000] uppercase text-sm tracking-wider">Visión</p>
                                        <p className="mt-3 text-gray-700 leading-relaxed text-sm">
                                            Ser una empresa reconocida por su liderazgo en Tecnologías de la Información, con calidad de servicio, compromiso y mejores prácticas para cada cliente.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="py-20 bg-white text-gray-900">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="mb-8">
                            <p className="text-sm font-bold tracking-widest text-[#FF8000] uppercase">Principales áreas de negocio</p>
                            <h2 className="mt-2 text-3xl font-extrabold">Tecnología para transformar tu operación</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[
                                {
                                    t: 'Cómputo e Impresión',
                                    b: ['Computadoras portátiles y de escritorio.', 'Impresoras, multifuncionales y consumibles.', 'Copiadoras y servicios administrados de impresión.'],
                                },
                                {
                                    t: 'Centro de Datos',
                                    b: ['Servidores, respaldos y virtualización.', 'Almacenamiento, enfriamiento y energía (UPS).', 'Diseño y construcción de infraestructura.'],
                                },
                                {
                                    t: 'Telecomunicaciones',
                                    b: ['Videoconferencia y comunicaciones.', 'Redes, cableado estructurado, VoIP y fibra óptica.', 'Soluciones en la nube.'],
                                },
                                {
                                    t: 'Seguridad y Videovigilancia',
                                    b: ['Antivirus, DRP, DLP, EPP.', 'Seguridad física y videovigilancia.', 'Ciberseguridad y equipo de seguridad informática.'],
                                },
                                {
                                    t: 'Software y Soluciones Digitales',
                                    b: ['Software y paquetería comercial.', 'Desarrollo a la medida de Apps.', 'Proyectos integrales y llave en mano.'],
                                },
                                {
                                    t: 'Inteligencia Artificial',
                                    b: ['Automatización de procesos.', 'Ciencia de datos y modernización de aplicaciones.', 'Gestión inteligente de la información.'],
                                },
                            ].map((x) => (
                                <div
                                    key={x.t}
                                    className="rounded-3xl border border-gray-200 bg-white p-7 transition-all duration-300 hover:shadow-lg hover:border-[#FF8000]/30 fade-up"
                                >
                                    <p className="font-extrabold text-[#FF8000] uppercase text-sm tracking-wider">{x.t}</p>
                                    <ul className="mt-4 space-y-2 text-sm text-gray-700">
                                        {x.b.map((li, idx) => (
                                            <li key={idx} className="flex items-start gap-3">
                                                <span className="mt-2 block h-1.5 w-1.5 rounded-full bg-[#FF8000]" />
                                                <span>{li}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="py-20 bg-gray-950 text-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="mb-8">
                            <p className="text-sm font-bold tracking-widest text-[#FF8000] uppercase">La confianza de nuestros clientes</p>
                            <h2 className="mt-2 text-3xl font-extrabold">Instituciones que respaldan nuestro trabajo</h2>
                        </div>
                        <div className="rounded-3xl border border-white/10 p-8 transition-all duration-300 hover:shadow-lg">
                            <p className="text-gray-300 text-sm max-w-2xl">
                                Hemos tenido el honor de colaborar con instituciones líderes y empresas de gran prestigio.
                            </p>
                            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    'Gobierno de Jalisco',
                                    'Gobierno de Zapopan',
                                    'Gobierno de Tlaquepaque',
                                    'UdeG',
                                    'UP',
                                    'Juegos Panamericanos 2011',
                                    'Industrias Tajín',
                                    'CONTPAQi',
                                ].map((name) => (
                                    <div
                                        key={name}
                                        className="h-16 rounded-2xl bg-gray-200/10 border border-white/10 flex items-center justify-center text-gray-100 px-3 text-center text-sm hover:border-[#FF8000]/40 transition-colors"
                                    >
                                        {name}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <section className="py-20 bg-white text-gray-900">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center">
                            <p className="text-sm font-bold tracking-widest text-[#FF8000] uppercase">Nuestro aliado estratégico exclusivo</p>
                            <h2 className="mt-3 text-4xl font-extrabold">ANADIC</h2>
                            <div className="mt-8 inline-flex items-center justify-center rounded-3xl border border-gray-200 bg-gray-50 p-6 transition-all duration-300 hover:shadow-lg fade-up-2">
                                <Image
                                    src="/Imagenes/AnadicMX.png"
                                    alt="ANADIC México"
                                    width={420}
                                    height={140}
                                    className="w-auto h-auto"
                                />
                            </div>
                            <p className="mt-6 max-w-3xl mx-auto text-sm text-gray-700 leading-relaxed">
                                Somos una asociación a nivel nacional de empresas dedicadas a la tecnología, en donde de acuerdo a nuestra especialización se encuentran cómputo, integradores de tecnología y especializadas en telecomunicaciones, mayoristas de valor de tecnología, expertos en robótica, consultoras, desarrolladores de software, y diversas especializaciones que requiere la industria de Tecnologías de la Información y Comunicaciones.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Contacto */}
                <section id="contacto" className="py-20 bg-gray-950 text-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
                            <div>
                                <p className="text-sm font-bold tracking-widest text-[#FF8000] uppercase">Contacto</p>
                                <h2 className="mt-3 text-4xl font-extrabold">Hablemos de tu proyecto</h2>
                                <div className="mt-6 space-y-4 text-gray-200">
                                    <div>
                                        <p className="text-gray-400 text-sm">Teléfono</p>
                                        <p className="text-xl font-bold">333 616-7279</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-sm">Correo</p>
                                        <p className="text-lg font-bold">desarrollo@nxt.it.com</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-sm">Dirección</p>
                                        <p className="text-sm leading-relaxed">
                                            Av. López Mateos #1038-11, Col Italia Providencia<br />
                                            CP 44630, Guadalajara, Jalisco
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-3xl border border-white/10 bg-white/5 p-7 transition-all duration-300 hover:border-[#FF8000]/30 hover:shadow-lg fade-up-2">
                                <p className="font-extrabold">Acciones rápidas</p>
                                <p className="text-sm text-gray-300 mt-2">
                                    Si ya tienes una idea de lo que necesitas, puedes iniciar una cotización en minutos.
                                </p>

                                <div className="mt-6 flex flex-col sm:flex-row gap-4">
                                    <Link
                                        href="/tienda/cotizaciones"
                                        className="px-6 py-3 rounded-xl bg-[#FF8000] hover:bg-[#e67300] text-gray-950 font-bold transition-colors text-center"
                                    >
                                        Solicitar cotización
                                    </Link>
                                    <a
                                        href="mailto:desarrollo@nxt.it.com"
                                        className="px-6 py-3 rounded-xl border border-white/20 hover:border-[#FF8000] bg-white/5 hover:bg-white/10 text-white font-bold transition-colors text-center"
                                    >
                                        Escribir por correo
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <footer className="py-10 bg-gray-950 border-t border-white/10">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Image src="/Imagenes/logo_nxtIt.png" alt="NXT.IT" width={90} height={30} className="h-6 w-auto transition-transform duration-300 hover:scale-105" />
                            <span className="text-sm text-gray-400">Integración de soluciones para tu operación</span>
                        </div>
                        <div className="text-sm text-gray-400">
                            Plaza Florencia, Av. Adolfo López Mateos #1038-11, Providencia, Guadalajara, Jal. · www.nxt.it.com
                        </div>
                    </div>
                </footer>
            </main>
            <style jsx>{`
                @keyframes fadeUp {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .fade-up {
                    animation: fadeUp 700ms ease both;
                }
                .fade-up-2 {
                    animation: fadeUp 900ms ease both;
                    animation-delay: 120ms;
                }
            `}</style>
        </div>
    )
}

export default Home
