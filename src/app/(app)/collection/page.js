'use client'

import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import FiltroGrupoSelects from '@/components/dashboard/FiltroGrupoSelects'
import EquipoSection from '@/components/dashboard/EquipoSection'
import { TOTAL_WORLD_CUP_CARDS, WORLD_CUP_DASHBOARD_DATA } from '@/data/worldCupDashboardData'
import AppHero from '@/components/coleccionador/AppHero'
import PageFade from '@/components/coleccionador/PageFade'
import AnimatedInteger from '@/components/coleccionador/AnimatedInteger'
import { loadCollectedKeys, saveCollectedKeys } from '@/lib/collectionStorage'

export default function CollectionPage() {
    const [activeGroup, setActiveGroup] = useState('A')
    const [activeTeam, setActiveTeam] = useState('')
    const [obtainedSet, setObtainedSet] = useState(() => new Set())
    const [albumMode, setAlbumMode] = useState(false)

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

    const cartasMostradas = currentTeamData?.cards?.length || 0
    const totalRegistradasGlobal = obtainedSet.size
    const totalDisponibles = TOTAL_WORLD_CUP_CARDS
    const ratio = totalDisponibles ? totalRegistradasGlobal / totalDisponibles : 0
    const progressWidth = ratio > 0 ? `${Math.max(ratio * 100, 0.8)}%` : '0%'
    const circumference = 2 * Math.PI * 44
    const dashOffset = circumference * (1 - Math.min(1, Math.max(0, ratio)))

    useEffect(() => {
        if (!currentGroupData?.teams?.length) return
        setActiveTeam(currentGroupData.teams[0].name)
    }, [activeGroup])

    const clearAll = () => {
        if (!confirm('¿Reiniciar todas las cartas guardadas en este dispositivo?')) return
        saveCollectedKeys(new Set())
        setObtainedSet(new Set())
    }

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
                eyebrow="Gestión de colección"
                title="Mis cartas"
                subtitle="Progreso y filtros."
            >
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => setAlbumMode((v) => !v)}
                        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-extrabold shadow-sm transition ${
                            albumMode ? 'bg-[#c9a227] text-[#0b1b3c]' : 'border border-white/25 bg-white/10 text-white'
                        }`}
                    >
                        {albumMode ? 'Modo álbum' : 'Modo lista'}
                    </button>
                    <Link
                        href="/planes"
                        className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15"
                    >
                        Planes
                    </Link>
                </div>
            </AppHero>

            <div className="relative z-[1] mx-auto max-w-2xl px-4 pb-12 -mt-3">
                <motion.div
                    layout
                    className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-[0_18px_50px_rgba(2,6,23,0.08)] backdrop-blur theme-dark:border-slate-700 theme-dark:bg-slate-900/70"
                >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                            <div className="relative h-28 w-28">
                                <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100" aria-hidden>
                                    <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="10" className="text-slate-200 theme-dark:text-slate-800" />
                                    <motion.circle
                                        cx="50"
                                        cy="50"
                                        r="44"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="10"
                                        strokeLinecap="round"
                                        className="text-[#c9a227]"
                                        strokeDasharray={circumference}
                                        initial={false}
                                        animate={{ strokeDashoffset: dashOffset }}
                                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                                    />
                                </svg>
                                <div className="absolute inset-0 grid place-items-center text-center">
                                    <p className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-500 theme-dark:text-slate-400">Total</p>
                                    <p className="text-2xl font-black text-slate-900 theme-dark:text-slate-50">
                                        <AnimatedInteger value={totalRegistradasGlobal} />
                                        <span className="text-base font-bold text-slate-500">/{totalDisponibles}</span>
                                    </p>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 theme-dark:text-slate-400">Progreso global</p>
                                <p className="mt-1 text-sm text-slate-600 theme-dark:text-slate-300">
                                    {cartasMostradas} cartas visibles en este país · {activeGroup}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-1 flex-col gap-2 sm:max-w-xs">
                            <div className="h-2 overflow-hidden rounded-full bg-gray-100 theme-dark:bg-slate-800">
                                <motion.div
                                    className="h-full bg-[#c9a227]"
                                    initial={false}
                                    animate={{ width: progressWidth }}
                                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <Link
                                    href="/scan"
                                    className="rounded-xl border border-slate-300 px-3 py-2 text-center text-sm font-semibold text-slate-700 transition hover:border-[#c9a227] theme-dark:border-slate-600 theme-dark:text-slate-200"
                                >
                                    Escanear carta
                                </Link>
                                <button
                                    type="button"
                                    onClick={clearAll}
                                    className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition active:scale-[0.99] theme-dark:border-red-900/40 theme-dark:bg-red-950/40 theme-dark:text-red-200"
                                >
                                    Reiniciar
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>

                <AnimatePresence initial={false}>
                    <motion.section
                        key={albumMode ? 'album' : 'list'}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.35 }}
                        className="mt-4 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-[0_18px_50px_rgba(2,6,23,0.08)] backdrop-blur theme-dark:border-slate-700 theme-dark:bg-slate-900/70"
                    >
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-xl font-extrabold app-text">{albumMode ? 'Álbum abierto' : 'Guardadas'}</h2>
                                <p className="text-sm app-subtle">
                                    {albumMode ? 'Espaciado amplio, sensación de libro coleccionable.' : 'Vista compacta para marcar rápido.'}
                                </p>
                            </div>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 theme-dark:bg-slate-800 theme-dark:text-slate-300">
                                {albumMode ? '2 columnas' : '2 columnas'}
                            </span>
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

                        <div className={`mt-4 ${albumMode ? 'rounded-[1.4rem] border border-dashed border-slate-300/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.7),rgba(248,250,252,0.9))] p-3 theme-dark:border-slate-700 theme-dark:bg-slate-950/40' : ''}`}>
                            {currentTeamData && (
                                <EquipoSection
                                    key={`${currentGroupData.group}-${currentTeamData.name}-${albumMode ? 'a' : 'l'}`}
                                    team={currentTeamData}
                                    obtainedSet={obtainedSet}
                                    onToggle={toggleObtained}
                                />
                            )}
                        </div>
                    </motion.section>
                </AnimatePresence>
            </div>
        </PageFade>
    )
}
