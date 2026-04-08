'use client'

import { useAuth } from '@/hooks/auth'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import FiltroGrupoSelects from '@/components/dashboard/FiltroGrupoSelects'
import EquipoSection from '@/components/dashboard/EquipoSection'
import { WORLD_CUP_DASHBOARD_DATA, TOTAL_WORLD_CUP_CARDS } from '@/data/worldCupDashboardData'

const STORAGE_KEY = 'collected_cards_worldcup_2026'

export default function DashboardPage() {
    const { user } = useAuth({})
    const [activeGroup, setActiveGroup] = useState('A')
    const [activeTeam, setActiveTeam] = useState('')
    const [obtainedSet, setObtainedSet] = useState(() => new Set())

    useEffect(() => {
        try {
            const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
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

    useEffect(() => {
        if (!currentGroupData?.teams?.length) return
        setActiveTeam(currentGroupData.teams[0].name)
    }, [activeGroup])

    const kpiRegistered = obtainedSet.size
    const total = TOTAL_WORLD_CUP_CARDS
    const kpiPercent = `${total ? Math.round((kpiRegistered / total) * 100) : 0}%`

    const toggleObtained = (cardKey) => {
        const next = new Set(obtainedSet)
        if (next.has(cardKey)) next.delete(cardKey)
        else next.add(cardKey)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)))
        setObtainedSet(next)
    }

    return (
        <>
            <section className="hero-top px-4 pt-5 pb-6">
                <div className="max-w-2xl mx-auto">
                    <p className="text-white/80 text-sm">Hola, {user?.name || 'coleccionista'}</p>
                    <h1 className="text-4xl font-extrabold text-white leading-tight">Tu panel</h1>
                    <p className="text-white/75 mt-1">Resumen de actividad y progreso de cartas</p>
                </div>
            </section>

            <div className="max-w-2xl mx-auto px-4 -mt-3">
                <div className="grid grid-cols-2 gap-3">
                    <div className="metric-card metric-gold">
                        <p className="text-sm opacity-90">Registradas</p>
                        <p className="text-4xl font-extrabold leading-none mt-1">{kpiRegistered}</p>
                        <p className="text-sm opacity-80 mt-1">cartas</p>
                    </div>
                    <div className="metric-card metric-navy">
                        <p className="text-sm opacity-90">Disponibles</p>
                        <p className="text-4xl font-extrabold leading-none mt-1">{total}</p>
                        <p className="text-sm opacity-80 mt-1">en listado</p>
                    </div>
                    <div className="metric-card metric-olive">
                        <p className="text-sm opacity-90">Progreso</p>
                        <p className="text-4xl font-extrabold leading-none mt-1">{kpiPercent}</p>
                        <p className="text-sm opacity-80 mt-1">coleccion</p>
                    </div>
                    <Link href="/scan" className="metric-card metric-slate block">
                        <p className="text-sm opacity-90">Escanear</p>
                        <p className="text-2xl font-extrabold leading-none mt-2">Nueva carta</p>
                        <p className="text-sm opacity-80 mt-2">Abrir camara</p>
                    </Link>
                </div>

                <section className="mt-5 rounded-3xl app-card border border-slate-200 shadow-sm p-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-xl font-extrabold app-text">Catalogo</h2>
                            <p className="text-sm app-subtle">Selecciona grupo y pais</p>
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
