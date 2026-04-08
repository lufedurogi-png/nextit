'use client'

const MIS_CARTAS_EXTRAS = [
    { id: 41, imageUrl: '/Imagenes/carta_base.png', cantidad: 1 },
    { id: 87, imageUrl: '/Imagenes/carta_base.png', cantidad: 2 },
    { id: 124, imageUrl: '/Imagenes/carta_base.png', cantidad: 3 },
    { id: 199, imageUrl: '/Imagenes/carta_base.png', cantidad: 1 },
    { id: 245, imageUrl: '/Imagenes/carta_base.png', cantidad: 4 },
    { id: 301, imageUrl: '/Imagenes/carta_base.png', cantidad: 2 },
]

const CARTAS_AMIGOS = [
    { amigo: 'Luis', id: 52, imageUrl: '/Imagenes/carta_base.png', cantidad: 2 },
    { amigo: 'Ana', id: 118, imageUrl: '/Imagenes/carta_base.png', cantidad: 1 },
    { amigo: 'Marcos', id: 244, imageUrl: '/Imagenes/carta_base.png', cantidad: 3 },
    { amigo: 'Sofia', id: 289, imageUrl: '/Imagenes/carta_base.png', cantidad: 2 },
]

export default function ComunidadPage() {
    return (
        <>
            <section className="hero-top px-4 pt-5 pb-6">
                <div className="max-w-2xl mx-auto">
                    <p className="text-white/80 text-sm">Intercambia y conecta</p>
                    <h1 className="text-4xl font-extrabold text-white leading-tight">Comunidad</h1>
                    <p className="text-white/75 mt-1">Cartas repetidas tuyas y de tus amigos</p>
                </div>
            </section>

            <div className="max-w-2xl mx-auto px-4 -mt-3 space-y-4">
                <section className="rounded-3xl app-card border border-slate-200 shadow-sm p-4">
                    <h2 className="text-xl font-extrabold app-text">Mis cartas extras</h2>
                    <p className="text-sm app-subtle mt-1">Contador no editable de cartas repetidas disponibles</p>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                        {MIS_CARTAS_EXTRAS.map((card) => (
                            <CartaConContador key={`extra-${card.id}`} id={card.id} imageUrl={card.imageUrl} cantidad={card.cantidad} />
                        ))}
                    </div>
                </section>

                <section className="rounded-3xl app-card border border-slate-200 shadow-sm p-4">
                    <h2 className="text-xl font-extrabold app-text">Amigos y cartas de amigos</h2>
                    <p className="text-sm app-subtle mt-1">Listado simulado de cartas repetidas por contacto</p>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                        {CARTAS_AMIGOS.map((item) => (
                            <CartaConContador
                                key={`friend-${item.amigo}-${item.id}`}
                                id={item.id}
                                imageUrl={item.imageUrl}
                                cantidad={item.cantidad}
                                nombre={item.amigo}
                            />
                        ))}
                    </div>
                </section>
            </div>
        </>
    )
}

function CartaConContador({ id, imageUrl, cantidad, nombre }) {
    return (
        <article className="rounded-2xl bg-white shadow-sm border border-gray-100 p-2 overflow-hidden theme-dark:bg-slate-900 theme-dark:border-slate-700">
            <div className="relative aspect-[3/4] rounded-xl overflow-hidden border border-gray-100 theme-dark:border-slate-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="absolute inset-0 w-full h-full object-cover" src={imageUrl} alt={`Carta ${id}`} />
                <div className="absolute top-2 left-2 rounded-lg bg-black/75 px-2.5 py-1 text-sm font-extrabold text-white">{String(id).padStart(3, '0')}</div>
            </div>

            <div className="mt-2 rounded-xl border border-cyan-700/30 bg-slate-700 px-2 py-1.5 text-white flex items-center justify-between">
                <span className="text-lg font-bold text-cyan-300">Cantidad:</span>
                <span className="rounded-lg bg-slate-600 px-2 py-0.5 text-cyan-300 font-bold">#</span>
                <span className="rounded-lg bg-slate-600 px-3 py-0.5 text-xl font-bold">{cantidad}</span>
            </div>

            {nombre ? <p className="mt-2 text-xs font-semibold text-slate-600 theme-dark:text-slate-300">Amigo: {nombre}</p> : null}
        </article>
    )
}
