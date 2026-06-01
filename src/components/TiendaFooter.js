'use client'

import Image from 'next/image'
import Link from 'next/link'

export default function TiendaFooter({ darkMode = false }) {
    return (
        <footer
            className={`border-t transition-colors duration-300 ${
                darkMode ? 'border-gray-800/70 bg-tienda-canvas' : 'border-gray-200 bg-white'
            }`}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className={`pb-10 border-b px-2 ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                    <div className="flex justify-center items-center">
                        <div className="flex justify-center sm:col-span-1 lg:col-span-1 lg:justify-self-center">
                            <Link
                                href="https://nxt.it.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand p-2 flex items-center"
                            >
                                <Image
                                    src="/Imagenes/logo_nxtIt.png"
                                    alt="NXT.IT"
                                    width={220}
                                    height={72}
                                    className="h-12 sm:h-14 md:h-16 w-auto object-contain opacity-95 hover:opacity-100 transition-opacity"
                                />
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-10">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="relative w-8 h-8">
                                <Image
                                    src="/Imagenes/icon_contacto.png"
                                    alt="Contacto"
                                    fill
                                    className={`object-contain ${darkMode ? 'brightness-0 invert' : ''}`}
                                />
                            </div>
                            <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                Contáctanos
                            </h3>
                        </div>
                        <div className={`space-y-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            <p className="text-lg font-semibold text-brand">333 616-7279</p>
                            <p className="text-base">desarrollo@nxt.it.com</p>
                            <p className="text-sm leading-relaxed">
                                Av. Lopez Mateos #1038-11, Col Italia Providencia CP 44630
                                <br />
                                Jalisco, Guadalajara
                            </p>
                        </div>
                    </div>

                    <div>
                        <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            Enlaces rápidos
                        </h3>
                        <ul className={`space-y-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            <li>
                                <Link href="/" className="hover:text-brand transition-colors">
                                    Inicio
                                </Link>
                            </li>
                            <li>
                                <Link href="/" className="hover:text-brand transition-colors">
                                    Tienda
                                </Link>
                            </li>
                            <li>
                                <Link href="/login" className="hover:text-brand transition-colors">
                                    Iniciar Sesión
                                </Link>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            Sobre nosotros
                        </h3>
                        <Link
                            href="/desarrolladores"
                            className="inline-flex items-center gap-1 text-sm font-bold tracking-wide hover:text-brand transition-colors mb-3"
                        >
                            <span className="text-brand">Equipo</span>
                            <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>de desarrollo</span>
                        </Link>
                        <p className={`text-sm leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Fundada en 2009 como Arrcuss Comercial de S de RL de CV, ahora NXT.IT, nació como un
                            proyecto emprendedor para democratizar la creciente necesidad por equipo de cómputo y
                            electrónica de las PYMES.
                        </p>
                    </div>

                    <div>
                        <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            Información
                        </h3>
                        <div className={`space-y-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            <p>
                                <span className="font-semibold">Misión:</span> Incrementar las capacidades de
                                nuestros clientes mediante innovadoras soluciones de software, hardware y tecnología
                                de consumo.
                            </p>
                            <p>
                                <span className="font-semibold">Visión:</span> Ser una empresa reconocida por su
                                liderazgo en el mercado de Tecnologías de la Información.
                            </p>
                        </div>
                    </div>
                </div>

                <div
                    className={`mt-8 pt-8 border-t text-center text-sm ${
                        darkMode ? 'border-gray-800 text-gray-400' : 'border-gray-200 text-gray-600'
                    }`}
                >
                    <p>&copy; {new Date().getFullYear()} NXT.IT. Todos los derechos reservados.</p>
                </div>
            </div>
        </footer>
    )
}
