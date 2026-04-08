import CartaItem from './CartaItem'

export default function EquipoSection({ team, obtainedSet, onToggle }) {
    return (
        <section className="rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
            <h3 className="mb-3 text-lg font-extrabold text-slate-900">{team.name}</h3>
            <div className="grid grid-cols-2 gap-3">
                {team.cards.map((card) => (
                    <CartaItem
                        key={card.key}
                        card={card}
                        obtained={obtainedSet.has(card.key)}
                        onToggle={() => onToggle(card.key)}
                    />
                ))}
            </div>
        </section>
    )
}
