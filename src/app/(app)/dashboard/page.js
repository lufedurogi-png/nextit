'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/auth'
import { useEffect, useMemo, useState } from 'react'
import FiltroGrupoSelects from '@/components/dashboard/FiltroGrupoSelects'
import EquipoSection from '@/components/dashboard/EquipoSection'
import { WORLD_CUP_DASHBOARD_DATA, TOTAL_WORLD_CUP_CARDS } from '@/data/worldCupDashboardData'
import AppHero from '@/components/coleccionador/AppHero'
import PageFade from '@/components/coleccionador/PageFade'
import AnimatedInteger from '@/components/coleccionador/AnimatedInteger'
import { loadCollectedKeys, saveCollectedKeys } from '@/lib/collectionStorage'

export default function DashboardPage() {
    const { user } = useAuth({})
    const [activeGroup, setActiveGroup] = useState('A')
    const [activeTeam, setActiveTeam] = useState('')
    const [obtainedSet, setObtainedSet] = useState(() => new Set())

    useEffect(() => {
        setObtainedSet(new Set(loadCollectedKeys()))
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
    const kpiPercent = total ? Math.round((kpiRegistered / total) * 100) : 0

    const toggleObtained = (cardKey) => {
        const next = new Set(obtainedSet)
        if (next.has(cardKey)) next.delete(cardKey)
        else next.add(cardKey)
        saveCollectedKeys(next)
        setObtainedSet(next)
    }

    return (
        <PageFade>
            <AppHero
                eyebrow={`Hola, ${user?.name || 'coleccionista'}`}
                title="Tu panel del mundial"
                subtitle="Progreso vivo."
            >
                <div className="flex flex-wrap gap-2">
                    <Link
                        href="/planes"
                        className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15"
                    >
                        Ver planes
                        <span aria-hidden>→</span>
                    </Link>
                    <Link
                        href="/scan"
                        className="inline-flex items-center gap-2 rounded-full bg-[#c9a227] px-4 py-2 text-sm font-extrabold text-[#0b1b3c] shadow-lg shadow-amber-900/20 transition hover:brightness-105"
                    >
                        Escanear carta
                    </Link>
                </div>
            </AppHero>

            <div className="relative z-[1] mx-auto max-w-2xl px-4 pb-10 -mt-3">
                <div className="grid grid-cols-2 gap-3">
                    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}>
                        <div className="metric-card metric-gold relative overflow-hidden">
                            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                            <p className="text-sm opacity-90">Registradas</p>
                            <p className="mt-1 text-4xl font-extrabold leading-none">
                                <AnimatedInteger value={kpiRegistered} />
                            </p>
                            <p className="mt-2 text-sm opacity-80">cartas</p>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <div className="metric-card metric-navy relative overflow-hidden">
                            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                            <p className="text-sm opacity-90">Disponibles</p>
                            <p className="mt-1 text-4xl font-extrabold leading-none">{total}</p>
                            <p className="mt-2 text-sm opacity-80">en listado</p>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <div className="metric-card metric-olive relative overflow-hidden">
                            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                            <p className="text-sm opacity-90">Progreso</p>
                            <p className="mt-1 text-4xl font-extrabold leading-none">
                                <AnimatedInteger value={kpiPercent} />%
                            </p>
                            <p className="mt-2 text-sm opacity-80">del álbum</p>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <Link href="/scan" className="metric-card metric-slate block h-full">
                            <p className="text-sm opacity-90">Escanear</p>
                            <p className="mt-1 text-2xl font-extrabold leading-none">Nueva carta</p>
                            <p className="mt-2 text-sm opacity-80">Abrir cámara</p>
                        </Link>
                    </motion.div>
                </div>

                <section className="mt-5 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-[0_18px_50px_rgba(2,6,23,0.08)] backdrop-blur theme-dark:border-slate-700 theme-dark:bg-slate-900/70">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-xl font-extrabold app-text">Catálogo</h2>
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

                <p className="mt-4 text-center text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-500 theme-dark:text-slate-400">
                    Progreso guardado en este dispositivo (demo local)
                </p>
            </div>
        </PageFade>
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
