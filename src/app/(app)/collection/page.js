'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import FiltroGrupoSelects from '@/components/dashboard/FiltroGrupoSelects'
import EquipoSection from '@/components/dashboard/EquipoSection'
import { TOTAL_WORLD_CUP_CARDS, WORLD_CUP_DASHBOARD_DATA } from '@/data/worldCupDashboardData'

const STORAGE_DASHBOARD_KEY = 'collected_cards_worldcup_2026'

export default function CollectionPage() {
    const [activeGroup, setActiveGroup] = useState('A')
    const [activeTeam, setActiveTeam] = useState('')
    const [obtainedSet, setObtainedSet] = useState(() => new Set())

    useEffect(() => {
        try {
            const raw = JSON.parse(localStorage.getItem(STORAGE_DASHBOARD_KEY) || '[]')
            const safe = Array.isArray(raw) ? raw.filter((x) => typeof x === 'string') : []
            setObtainedSet(new Set(safe))
        } catch {
            setObtainedSet(new Set())
        }
    }, [])

    const groups = useMemo(() => WORLD_CUP_DASHBOARD_DATA.map((g) => g.group), [])
    const currentGroupData = useMemo(
        () => WORLD_CUP_DASHBOARD_DATA.find((g) => g.group === activeGroup) || WORLD_CUP_DASHBOARD_DATA[0],
        [activeGroup]
    )
    const currentTeamData = useMemo(
        () => currentGroupData.teams.find((team) => team.name === activeTeam) || currentGroupData.teams[0],
        [currentGroupData, activeTeam]
    )

    const cartasMostradas = currentTeamData?.cards?.length || 0
    const totalRegistradas = cartasMostradas
    const totalDisponibles = TOTAL_WORLD_CUP_CARDS
    const ratio = totalDisponibles ? totalRegistradas / totalDisponibles : 0
    const progressWidth = ratio > 0 ? `${Math.max(ratio * 100, 0.8)}%` : '0%'

    useEffect(() => {
        if (!currentGroupData?.teams?.length) return
        setActiveTeam(currentGroupData.teams[0].name)
    }, [activeGroup])

    const clearAll = () => {
        if (!confirm('¿Reiniciar guardadas?')) return
        localStorage.setItem(STORAGE_DASHBOARD_KEY, JSON.stringify([]))
        setObtainedSet(new Set())
    }

    const toggleObtained = (cardKey) => {
        const next = new Set(obtainedSet)
        if (next.has(cardKey)) next.delete(cardKey)
        else next.add(cardKey)
        localStorage.setItem(STORAGE_DASHBOARD_KEY, JSON.stringify(Array.from(next)))
        setObtainedSet(next)
    }

    return (
        <>
            <section className="hero-top px-4 pt-5 pb-6">
                <div className="max-w-2xl mx-auto">
                    <p className="text-white/80 text-sm">Gestión de colección</p>
                    <h1 className="text-4xl font-extrabold text-white leading-tight">Mis cartas</h1>
                    <p className="text-white/75 mt-1">Filtros y progreso general</p>
                </div>
            </section>

            <div className="max-w-2xl mx-auto px-4 -mt-3">
                <div className="rounded-3xl app-card border border-slate-200 shadow-sm p-4">
                    <div className="text-xs text-gray-500 theme-dark:text-slate-400">Progreso</div>
                    <div className="mt-1 flex items-end gap-2">
                        <div className="text-3xl font-extrabold text-gray-900 theme-dark:text-slate-50">{totalRegistradas}</div>
                        <div className="pb-1 text-sm text-gray-500 theme-dark:text-slate-400">/ {totalDisponibles}</div>
                    </div>

                    <div className="mt-3 h-2 rounded-full bg-gray-100 theme-dark:bg-slate-800 overflow-hidden">
                        <div
                            className="h-full bg-[#c9a227] transition-[width] duration-500"
                            style={{ width: progressWidth }}
                        />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                        <Link
                            href="/scan"
                            className="rounded-xl border border-slate-300 px-3 py-2 text-center text-sm font-semibold text-slate-700 theme-dark:text-slate-200 theme-dark:border-slate-600"
                        >
                            Escanear carta
                        </Link>
                        <button
                            type="button"
                            onClick={clearAll}
                            className="flex-1 rounded-xl bg-white border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 active:scale-[0.99] theme-dark:bg-slate-900 theme-dark:border-slate-600 theme-dark:text-slate-200"
                        >
                            Reiniciar guardadas
                        </button>
                    </div>
                </div>

                <section className="mt-4 rounded-3xl app-card border border-slate-200 shadow-sm p-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-xl font-extrabold app-text">Guardadas</h2>
                            <p className="text-sm app-subtle">Selecciona grupo y pais · {cartasMostradas} mostradas</p>
                        </div>
                        <IconCardsSmall />
                    </div>

                    <div className="mt-4">
                        <FiltroGrupoSelects
                            groups={groups}
                            activeGroup={currentGroupData.group}
                            activeTeam={currentTeamData?.name || ''}
                            teamsForGroup={currentGroupData.teams}
                            onGroupChange={setActiveGroup}
                            onTeamChange={setActiveTeam}
                        />
                    </div>

                    <div className="mt-4">
                        {currentTeamData && (
                            <EquipoSection
                                key={`${currentGroupData.group}-${currentTeamData.name}`}
                                team={currentTeamData}
                                obtainedSet={obtainedSet}
                                onToggle={toggleObtained}
                            />
                        )}
                    </div>
                </section>
            </div>
        </>
    )
}

function IconCardsSmall() {
    return (
        <svg className="h-6 w-6 text-slate-700 theme-dark:text-slate-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <rect x="3" y="5" width="13" height="16" rx="2" />
            <rect x="8" y="3" width="13" height="16" rx="2" opacity="0.85" />
        </svg>
    )
}
