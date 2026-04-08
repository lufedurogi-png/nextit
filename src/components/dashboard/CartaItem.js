export default function CartaItem({ card, obtained, onToggle }) {
    return (
        <button
            type="button"
            onClick={onToggle}
            className={`group relative rounded-2xl border p-2 transition ${
                obtained
                    ? 'border-emerald-500/70 bg-emerald-500/10 opacity-75'
                    : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
            title={obtained ? 'Carta obtenida' : 'Carta faltante'}
        >
            <div className="relative aspect-[3/4] overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={card.imageUrl} alt={`Carta ${card.id}`} className="absolute inset-0 h-full w-full object-cover" />
                <span className="absolute left-1.5 top-1.5 rounded bg-black/75 px-2.5 py-1 text-sm font-extrabold text-white">
                    {String(card.id).padStart(3, '0')}
                </span>
            </div>
        </button>
    )
}
