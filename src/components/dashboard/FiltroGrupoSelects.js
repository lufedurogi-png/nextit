'use client'

export default function FiltroGrupoSelects({
    groups,
    activeGroup,
    activeTeam,
    teamsForGroup,
    onGroupChange,
    onTeamChange,
}) {
    return (
        <div className="grid grid-cols-1 gap-3">
            <div>
                <label htmlFor="groupSelect" className="mb-1 block text-xs font-semibold text-slate-600">
                    Grupo
                </label>
                <select
                    id="groupSelect"
                    value={activeGroup}
                    onChange={(e) => onGroupChange(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900"
                >
                    {groups.map((group) => (
                        <option key={group} value={group}>
                            Grupo {group}
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <label htmlFor="teamSelect" className="mb-1 block text-xs font-semibold text-slate-600">
                    Pais
                </label>
                <select
                    id="teamSelect"
                    value={activeTeam}
                    onChange={(e) => onTeamChange(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900"
                >
                    {teamsForGroup.map((team) => (
                        <option key={team.name} value={team.name}>
                            {team.name}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    )
}
