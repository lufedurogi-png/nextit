export default function FiltroGrupoTabs({ groups, activeGroup, onChange }) {
    return (
        <div className="overflow-x-auto pb-1">
            <div className="inline-flex min-w-full gap-2">
                {groups.map((group) => {
                    const active = group === activeGroup
                    return (
                        <button
                            key={group}
                            type="button"
                            onClick={() => onChange(group)}
                            className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold border transition-colors ${
                                active
                                    ? 'bg-[#0b1b3c] text-white border-[#0b1b3c]'
                                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                            }`}
                        >
                            Grupo {group}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
